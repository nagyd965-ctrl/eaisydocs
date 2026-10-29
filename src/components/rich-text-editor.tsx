"use client"

import React, { useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { marked } from "marked"
import { sanitizeHtml } from "@/lib/sanitize-html"
import { Textarea } from "@/components/ui/textarea"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function normalizeToHtml(raw: string): string {
  if (!raw || !raw.trim()) return ""
  try {
    const parsed = marked.parse(raw, { breaks: true, gfm: true })
    return sanitizeHtml(typeof parsed === "string" ? parsed : raw)
  } catch {
    return sanitizeHtml(raw)
  }
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Kezdd el írni a pozíció részletes leírását (Rólunk, Főbb feladatok, Elvárások, Amit kínálunk)...",
  className,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<"visual" | "source">("visual")
  const [, setSelectionTick] = useState(0)
  const lastEmittedRef = useRef<string>("")

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: normalizeToHtml(value),
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[260px] max-h-[460px] overflow-y-auto p-4 focus:outline-none",
          "prose max-w-none prose-slate dark:prose-invert text-foreground/90",
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:mt-5 first:[&_h2]:mt-0 [&_h2]:mb-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 first:[&_h3]:mt-0 [&_h3]:mb-1.5",
          "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-3.5 first:[&_h4]:mt-0 [&_h4]:mb-1",
          "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/90 [&_p]:mb-2.5 last:[&_p]:mb-0",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-2.5 [&_ul]:text-sm [&_ul]:text-foreground/90",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:my-2.5 [&_ol]:text-sm [&_ol]:text-foreground/90",
          "[&_li]:leading-relaxed",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
          "[&_b]:font-semibold [&_b]:text-foreground",
          "[&_em]:italic",
          "[&_u]:underline [&_u]:underline-offset-2",
          "[&_blockquote]:border [&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:my-3 [&_blockquote]:rounded-lg [&_blockquote]:text-sm [&_blockquote]:text-foreground/90",
          "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:text-xs"
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = sanitizeHtml(ed.getHTML())
      lastEmittedRef.current = html
      onChange(html)
      setSelectionTick((t) => t + 1)
    },
    onSelectionUpdate: () => {
      setSelectionTick((t) => t + 1)
    },
    onTransaction: () => {
      setSelectionTick((t) => t + 1)
    },
  })

  // Külső értékváltozás (pl. AI generálás vagy betöltés) szinkronizálása
  useEffect(() => {
    if (!editor) return
    const normalized = normalizeToHtml(value)
    if (value === lastEmittedRef.current || normalized === sanitizeHtml(editor.getHTML())) {
      return
    }
    lastEmittedRef.current = normalized
    editor.commands.setContent(normalized, { emitUpdate: false })
  }, [value, editor])

  /**
   * Kiemelés (Blockquote) valódi ki-be kapcsolása:
   * - Ha a kurzor már egy kiemelésben (blockquote) van (akár lista, akár bekezdés részeként),
   *   egyetlen kattintással kicsomagolja (eltávolítja) a külső blockquote blokko(ka)t.
   * - Ha még nincs kiemelésben, létrehoz egyetlen tiszta blockquote blokkot.
   */
  function handleToggleBlockquote() {
    if (!editor) return

    if (editor.isActive("blockquote")) {
      editor
        .chain()
        .focus()
        .command(({ state, tr, dispatch }) => {
          const { $from } = state.selection
          // Kicsomagoljuk a legkülső blockquote csomópontot, hogy egymásba ágyazott esetben is azonnal eltűnjön
          for (let d = 1; d <= $from.depth; d++) {
            const node = $from.node(d)
            if (node.type.name === "blockquote") {
              const pos = $from.before(d)
              // Ha a blockquote-on belül még egy blockquote volt, annak is a belső tartalmát emeljük ki
              let innerContent = node.content
              while (
                innerContent.childCount === 1 &&
                innerContent.firstChild?.type.name === "blockquote"
              ) {
                innerContent = innerContent.firstChild.content
              }
              tr.replaceWith(pos, pos + node.nodeSize, innerContent)
              if (dispatch) dispatch(tr)
              return true
            }
          }
          return false
        })
        .run()
    } else {
      editor.chain().focus().toggleBlockquote().run()
    }
  }

  /**
   * Minden formázás (félkövér, dőlt, aláhúzás, címsor, kiemelés) törlése a kijelölésről
   */
  function handleClearFormatting() {
    if (!editor) return
    if (editor.isActive("blockquote")) {
      handleToggleBlockquote()
    }
    editor.chain().focus().unsetAllMarks().clearNodes().run()
  }

  const isH3 = editor?.isActive("heading", { level: 3 }) ?? false
  const isH4 = editor?.isActive("heading", { level: 4 }) ?? false
  const isParagraph =
    (editor?.isActive("paragraph") ?? false) &&
    !isH3 &&
    !isH4 &&
    !(editor?.isActive("blockquote") ?? false) &&
    !(editor?.isActive("bulletList") ?? false) &&
    !(editor?.isActive("orderedList") ?? false)
  const isBold = editor?.isActive("bold") ?? false
  const isItalic = editor?.isActive("italic") ?? false
  const isUnderline = editor?.isActive("underline") ?? false
  const isBulletList = editor?.isActive("bulletList") ?? false
  const isOrderedList = editor?.isActive("orderedList") ?? false
  const isBlockquote = editor?.isActive("blockquote") ?? false
  const canUndo = editor?.can().undo() ?? false
  const canRedo = editor?.can().redo() ?? false

  const toolbarBtnClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors select-none",
      active
        ? "bg-primary text-primary-foreground border-primary font-semibold"
        : "border-transparent bg-transparent text-foreground/85 hover:bg-background hover:border-border hover:text-foreground"
    )

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        className
      )}
    >
      {/* Professzionális Formázó Eszköztár */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/70 bg-muted/30">
        {mode === "visual" ? (
          <div className="flex flex-wrap items-center gap-1">
            {/* Visszavonás / Újra */}
            <button
              type="button"
              disabled={!canUndo}
              onClick={() => editor?.chain().focus().undo().run()}
              className={cn(
                "inline-flex items-center justify-center h-7 w-7 rounded-md border border-transparent transition-colors",
                canUndo
                  ? "text-foreground hover:bg-background hover:border-border"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
              title="Visszavonás (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={() => editor?.chain().focus().redo().run()}
              className={cn(
                "inline-flex items-center justify-center h-7 w-7 rounded-md border border-transparent transition-colors",
                canRedo
                  ? "text-foreground hover:bg-background hover:border-border"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
              title="Újra (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <span className="h-4 w-px bg-border mx-1" />

            {/* Bekezdés és Címsorok (Toggle) */}
            <button
              type="button"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={toolbarBtnClass(isH3)}
              title="Szekciócím (H3) — újbóli kattintásra normál szöveg"
            >
              Címsor
            </button>
            <button
              type="button"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 4 }).run()
              }
              className={toolbarBtnClass(isH4)}
              title="Alcím (H4) — újbóli kattintásra normál szöveg"
            >
              Alcím
            </button>
            <button
              type="button"
              onClick={() => {
                if (isBlockquote) handleToggleBlockquote()
                editor?.chain().focus().setParagraph().run()
              }}
              className={toolbarBtnClass(isParagraph)}
              title="Normál bekezdés"
            >
              Bekezdés
            </button>

            <span className="h-4 w-px bg-border mx-1" />

            {/* Szövegstílusok (Toggle) */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={toolbarBtnClass(isBold)}
              title="Félkövér (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
              <span>Félkövér</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={toolbarBtnClass(isItalic)}
              title="Dőlt (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
              <span>Dőlt</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={toolbarBtnClass(isUnderline)}
              title="Aláhúzott (Ctrl+U)"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
              <span>Aláhúzott</span>
            </button>

            <span className="h-4 w-px bg-border mx-1" />

            {/* Listák és Kiemelés (Toggle) */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={toolbarBtnClass(isBulletList)}
              title="Pontozott felsorolás be/ki"
            >
              <List className="w-3.5 h-3.5" />
              <span>Felsorolás</span>
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={toolbarBtnClass(isOrderedList)}
              title="Számozott lista be/ki"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Számozott lista</span>
            </button>
            <button
              type="button"
              onClick={handleToggleBlockquote}
              className={toolbarBtnClass(isBlockquote)}
              title="Kiemelt doboz be/ki kapcsolása"
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Kiemelés</span>
            </button>

            <span className="h-4 w-px bg-border mx-1" />

            {/* Formázás törlése */}
            <button
              type="button"
              onClick={handleClearFormatting}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-transparent text-muted-foreground hover:text-foreground hover:bg-background hover:border-border transition-colors"
              title="Minden formázás és kiemelés eltávolítása a kijelölt részről"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
              <span>Formázás törlése</span>
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            HTML / Markdown forráskód szerkesztése
          </span>
        )}

        <div className="inline-flex rounded-md border border-border/70 bg-background/60 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (mode !== "visual") {
                const normalized = normalizeToHtml(value)
                editor?.commands.setContent(normalized, { emitUpdate: false })
                setMode("visual")
              }
            }}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors",
              mode === "visual"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Formázott szerkesztő
          </button>
          <button
            type="button"
            onClick={() => setMode("source")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors",
              mode === "source"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            HTML forrás
          </button>
        </div>
      </div>

      {/* Szerkesztőfelület */}
      {mode === "visual" ? (
        <EditorContent editor={editor} />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => {
            lastEmittedRef.current = e.target.value
            onChange(e.target.value)
          }}
          className="min-h-[260px] max-h-[460px] border-0 rounded-none font-mono text-xs leading-relaxed focus-visible:ring-0"
          placeholder={placeholder}
        />
      )}
    </div>
  )
}
