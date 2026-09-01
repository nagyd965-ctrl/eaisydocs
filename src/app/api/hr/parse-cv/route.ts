import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
if (typeof global !== "undefined" && typeof (global as any).DOMMatrix === "undefined") {
  (global as any).DOMMatrix = class {};
}

export async function POST(req: Request) {
  let toborzas_id: string | null = null;
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    toborzas_id = body.toborzas_id;
    if (!toborzas_id) {
      return NextResponse.json({ error: "Missing toborzas_id" }, { status: 400 });
    }

    // Get candidate and job description
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("hr_toborzas")
      .select(`
        *,
        hr_allashirdetes ( cim, rovid_leiras, reszletes_leiras )
      `)
      .eq("id", toborzas_id)
      .single();

    if (candidateError || !candidate) {
      console.error("Supabase Error finding candidate:", candidateError);
      return NextResponse.json({ error: "Candidate nem található: " + (candidateError?.message || 'Nincs adat') }, { status: 404 });
    }

    if (!candidate.cv_storage_path) {
      return NextResponse.json({ error: "No CV uploaded" }, { status: 400 });
    }

    // Set status to processing
    await supabaseAdmin.from("hr_toborzas").update({ ai_status: 'processing' }).eq("id", toborzas_id);

    // Download CV PDF
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("hr_dokumentumok")
      .download(candidate.cv_storage_path);

    if (downloadError || !fileData) {
      await supabaseAdmin.from("hr_toborzas").update({ ai_status: 'error' }).eq("id", toborzas_id);
      return NextResponse.json({ error: "Could not download CV" }, { status: 500 });
    }

    // Parse PDF text
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Using pdf-parse v2 API
    // Using eval to hide the require from Turbopack so it doesn't try to bundle it and crash on dynamic requires inside pdf.js
    const pdfParseModule = eval('require("pdf-parse")');
    const { PDFParse } = pdfParseModule;
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const cvText = result.text;

    // Construct prompt
    const jobDescription = candidate.hr_allashirdetes 
      ? `Pozíció: ${candidate.hr_allashirdetes.cim}\nRövid leírás: ${candidate.hr_allashirdetes.rovid_leiras}\nRészletek: ${candidate.hr_allashirdetes.reszletes_leiras}`
      : "Nincs megadva specifikus munkaköri leírás, általános értékelést kérünk.";

    const prompt = `Te egy profi HR asszisztens vagy. Elemzd a következő önéletrajzot a megadott munkaköri leírás alapján.
Szigorúan csak egy JSON formátumú választ adj vissza (markdown nélkül, plain textként), a következő mezőkkel:
{
  "summary": "2-3 mondatos összefoglaló a jelölt relevanciájáról magyar nyelven.",
  "relevance_score": <egész szám 0 és 100 között, ami mutatja a megfelelőséget>,
  "skills": ["Skill 1", "Skill 2", "Skill 3"]
}

Munkaköri leírás:
${jobDescription}

Önéletrajz szövege:
${cvText}
`;

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let responseText = response.text || "";
    
    // Parse JSON safely
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    let aiResult;
    try {
      aiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error. Raw response:", responseText);
      await supabaseAdmin.from("hr_toborzas").update({ ai_status: 'error' }).eq("id", toborzas_id);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Update candidate
    await supabaseAdmin.from("hr_toborzas").update({
      ai_summary: aiResult.summary,
      ai_relevance_score: aiResult.relevance_score,
      ai_skills: aiResult.skills,
      ai_status: 'completed'
    }).eq("id", toborzas_id);

    return NextResponse.json({ success: true, result: aiResult });

  } catch (error: any) {
    console.error("AI CV Parse error:", error);
    if (toborzas_id) {
      try {
        await supabaseAdmin.from("hr_toborzas").update({ ai_status: 'error' }).eq("id", toborzas_id);
      } catch (e) {
        console.error("Could not reset status", e);
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
