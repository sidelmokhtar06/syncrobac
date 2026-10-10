import { useState } from 'react'
import { AnimatePresence, m, useMotionValue, useTransform } from 'motion/react'
import { Plus, Trash2 } from 'lucide-react'
import { completeMissions } from '../lib/curriculum'
import { cn } from '../lib/cn'
import { db, markActive, type Task } from '../lib/db'
import { useT } from '../lib/i18n'
import { Burst, spring } from './motion'
import { inputClass } from './ui'

export function TaskList({ tasks, subjectId, chapterId }: { tasks: Task[]; subjectId: string; chapterId?: string }) {
  const { t } = useT()
  const sorted = [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt)
  return (
    <div>
      <AnimatePresence initial={false}>
        {sorted.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </AnimatePresence>
      <AddTask subjectId={subjectId} chapterId={chapterId} placeholder={t('addTask')} />
      {tasks.length > 0 && <p className="mt-2 text-center text-xs text-ink-3">{t('swipeHint')}</p>}
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const [fire, setFire] = useState(0)
  const x = useMotionValue(0)
  const reveal = useTransform(x, [-120, -40, 0, 40, 120], [1, 0.4, 0, 0.4, 1])

  const toggle = async () => {
    if (!task.done) setFire(Date.now())
    await db.tasks.update(task.id!, { done: !task.done })
    if (!task.done) {
      await markActive()
      await completeMissions({ subjectId: task.subjectId, chapterId: task.chapterId ?? null, taskId: task.id })
    }
  }

  return (
    <m.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      transition={spring}
      className="relative overflow-hidden rounded-xl"
    >
      <m.div style={{ opacity: reveal }} className="absolute inset-0 flex items-center justify-between rounded-xl bg-danger/12 px-4 text-danger" aria-hidden>
        <Trash2 size={18} />
        <Trash2 size={18} />
      </m.div>
      <m.div
        drag="x"
        dragSnapToOrigin
        dragElastic={0.5}
        style={{ x, touchAction: 'pan-y' }}
        onDragEnd={(_, info) => Math.abs(info.offset.x) > 120 && db.tasks.delete(task.id!)}
        className="relative flex min-h-12 items-center gap-1 bg-surface"
      >
        {/* 44px hit area around a 22px box */}
        <button onClick={toggle} aria-label={task.title} aria-pressed={task.done} className="relative grid size-11 shrink-0 place-items-center">
          <m.span
            animate={{
              backgroundColor: task.done ? '#22C1D6' : 'rgba(0,0,0,0)',
              borderColor: task.done ? '#22C1D6' : '#4A5363',
              scale: task.done ? [1, 1.15, 1] : 1,
            }}
            transition={{ duration: 0.25 }}
            className="absolute size-[22px] rounded-md border-2"
          />
          <svg viewBox="0 0 24 24" className="relative size-4">
            <m.path
              d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#061A1F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: task.done ? 1 : 0 }}
              transition={{ duration: 0.25, delay: task.done ? 0.06 : 0 }}
            />
          </svg>
          <Burst fire={fire} count={8} radius={24} />
        </button>
        <span className="flex-1 py-2 text-[15px]">
          <span className={cn('transition-colors duration-300', task.done ? 'text-ink-3 line-through decoration-ink-3' : 'text-ink')}>{task.title}</span>
        </span>
        {/* Keyboard / screen-reader alternative to swiping */}
        <button onClick={() => db.tasks.delete(task.id!)} className="sr-only text-ink-3 focus:not-sr-only focus:grid focus:size-11 focus:place-items-center" aria-label="delete">
          <Trash2 size={18} />
        </button>
      </m.div>
    </m.div>
  )
}

function AddTask({ subjectId, chapterId, placeholder }: { subjectId: string; chapterId?: string; placeholder: string }) {
  const [title, setTitle] = useState('')
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        db.tasks.add({ subjectId, chapterId, title: title.trim(), done: false, createdAt: Date.now() })
        setTitle('')
      }}
    >
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} className={cn(inputClass, 'min-w-0 flex-1')} />
      <m.button
        type="submit"
        whileTap={{ scale: 0.92 }}
        transition={spring}
        disabled={!title.trim()}
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink transition-opacity disabled:opacity-40"
        aria-label="add"
      >
        <Plus size={20} />
      </m.button>
    </form>
  )
}
