import PlayPage from '@/modules/app/pages/play/pages/page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/app/play/')({
  component: PlayPage,
})

