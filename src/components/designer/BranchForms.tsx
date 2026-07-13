'use client'
import { useState } from 'react'

export function AddBranchForm({ onAdd }: { onAdd: (label1: string, label2: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="min-h-11 md:min-h-0 px-2 py-1 text-sm rounded-md border border-dashed border-accent text-accent">
        + Add Branch
      </button>
    )
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const label1 = (form.elements.namedItem('label1') as HTMLInputElement).value.trim()
        const label2 = (form.elements.namedItem('label2') as HTMLInputElement).value.trim()
        if (label1 && label2) {
          onAdd(label1, label2)
          setOpen(false)
        }
      }}
    >
      <input name="label1" placeholder="Branch 1 label (e.g. existing continuation)" className="px-2 py-1 rounded-md border border-border bg-bg text-text text-sm" />
      <input name="label2" placeholder="Branch 2 label (new alternative)" className="px-2 py-1 rounded-md border border-border bg-bg text-text text-sm" />
      <div className="flex gap-2">
        <button type="submit" className="px-2 py-1 text-sm rounded-md border border-accent text-accent">Create Branches</button>
        <button type="button" onClick={() => setOpen(false)} className="px-2 py-1 text-sm rounded-md border border-border text-text-muted">Cancel</button>
      </div>
    </form>
  )
}

export function AddAnotherBranchForm({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="min-h-11 md:min-h-0 px-2 py-1 text-sm rounded-md border border-dashed border-accent text-accent">
        + Add Another Branch
      </button>
    )
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('label') as HTMLInputElement
        if (input.value.trim()) {
          onAdd(input.value.trim())
          setOpen(false)
        }
      }}
    >
      <input name="label" placeholder="Branch label" className="flex-1 px-2 py-1 rounded-md border border-border bg-bg text-text text-sm" />
      <button type="submit" className="px-2 py-1 text-sm rounded-md border border-accent text-accent">Add</button>
    </form>
  )
}
