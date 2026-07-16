"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"

export default function PrintProtocolPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem("printProtocolData")
    if (stored) {
      setData(JSON.parse(stored))
      // Kis késleltetés, hogy a React biztosan lerenderelje a tartalmat
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [])

  if (!data) return <div className="p-8">Töltés...</div>

  return (
    <div className="p-8 bg-white text-black font-serif max-w-4xl mx-auto min-h-screen">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Selejtezési Jegyzőkönyv</h1>
        <p className="text-sm text-gray-600">Készült az eaisyDocs rendszer által a törvényi előírásoknak megfelelően</p>
      </div>
      
      <div className="mb-6 space-y-2 text-lg">
        <p><strong>Készült:</strong> {data.date}</p>
        <p><strong>Felterjesztette:</strong> {data.proposer}</p>
        <p><strong>Jóváhagyta és hitelesítette:</strong> {data.approver}</p>
      </div>

      <div className="mb-10 text-justify text-lg leading-relaxed">
        <p className="mb-4">Alulírott <strong>{data.approver}</strong> igazolom, hogy a megőrzési idő lejártára hivatkozva a "Négy szem elvét" betartva jóváhagytam az alábbi elektronikus ügyiratok és a hozzájuk tartozó digitális fizikai állományok megsemmisítését. A javaslatot <strong>{data.proposer}</strong> terjesztette fel. A fájlok a rendszerből visszaállíthatatlanul törlésre kerültek.</p>
        <h3 className="font-bold mb-4 mt-8 text-xl">Megsemmisített Ügyiratok Listája:</h3>
        <ul className="list-decimal pl-8 space-y-2">
          {data.items?.map((ikt: string) => (
            <li key={ikt} className="font-medium">{ikt}</li>
          ))}
        </ul>
      </div>

      <div className="mt-32 flex justify-between px-10">
        <div className="text-center">
          <div className="w-64 border-b border-black mb-2 h-16"></div>
          <p className="text-base font-semibold">{data.proposer}</p>
          <p className="text-sm text-gray-600">Iratkezelő (Felterjesztő)</p>
        </div>
        <div className="text-center">
          <div className="w-64 border-b border-black mb-2 h-16 flex items-end justify-center pb-1 font-signature text-2xl">Rendszer Rögzítve</div>
          <p className="text-base font-semibold">{data.approver}</p>
          <p className="text-sm text-gray-600">Vezető (Jóváhagyó)</p>
        </div>
      </div>
      
      {/* Csak képernyőn látszik, nyomtatáskor eltűnik */}
      <div className="mt-16 text-center print:hidden">
        <p className="text-muted-foreground mb-4">A nyomtatási ablak automatikusan megnyílt. Ha mégsem, kattints a gombra:</p>
        <button 
          onClick={() => window.print()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
        >
          <FileText className="w-4 h-4" />
          Újra nyomtatás
        </button>
      </div>
    </div>
  )
}
