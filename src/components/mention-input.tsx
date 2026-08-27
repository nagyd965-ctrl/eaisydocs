"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"

interface MentionUser {
  id: string
  nev: string
}

interface MentionInputProps {
  users: MentionUser[]
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export function MentionInput({ users, value, onChange, onSubmit, disabled, placeholder }: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredUsers = users.filter(u =>
    u.nev.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [mentionQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const insertMention = useCallback((user: MentionUser) => {
    // Replace the @query with @Username
    const before = value.substring(0, mentionStartIndex)
    const after = value.substring(mentionStartIndex + mentionQuery.length + 1) // +1 for @
    const newValue = `${before}@${user.nev} ${after}`
    onChange(newValue)
    setShowDropdown(false)
    setMentionQuery("")
    setMentionStartIndex(-1)

    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [value, mentionStartIndex, mentionQuery, onChange])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const cursorPos = e.target.selectionStart || 0

    // Look backwards from cursor to find @ symbol
    let atIndex = -1
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (newValue[i] === "@") {
        // Check if it's at start or preceded by space
        if (i === 0 || newValue[i - 1] === " ") {
          atIndex = i
          break
        }
        break
      }
      if (newValue[i] === " " && i < cursorPos - 1) {
        // Allow spaces in names (e.g., "@Nagy Dá" is still typing)
        // But if we encounter more than the query text, stop
      }
    }

    if (atIndex >= 0) {
      const query = newValue.substring(atIndex + 1, cursorPos)
      // Only show dropdown if query doesn't contain a completed mention followed by space+non@
      if (query.length <= 50) {
        setMentionStartIndex(atIndex)
        setMentionQuery(query)
        setShowDropdown(true)
      }
    } else {
      setShowDropdown(false)
      setMentionQuery("")
      setMentionStartIndex(-1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(filteredUsers[selectedIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowDropdown(false)
        return
      }
    }

    // Normal enter → submit the comment
    if (e.key === "Enter" && !showDropdown) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* Mention dropdown */}
      {showDropdown && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-full max-h-[180px] overflow-y-auto rounded-lg border border-border bg-popover shadow-md z-50"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => insertMention(user)}
            >
              <span className="font-medium">{user.nev}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Render comment text with @mentions highlighted
 */
export function renderMentionText(text: string, users: { id: string; nev: string }[]) {
  const userNames = users.map(u => u.nev)
  // Build regex to match @Username patterns
  if (userNames.length === 0) return text

  // Escape special regex chars in names and sort by length (longest first to avoid partial matches)
  const escaped = userNames
    .sort((a, b) => b.length - a.length)
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  
  const regex = new RegExp(`@(${escaped.join("|")})`, "g")
  
  const parts: (string | { type: "mention"; name: string })[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    parts.push({ type: "mention", name: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}
