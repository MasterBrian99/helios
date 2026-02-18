import AnalyzePage from '@/modules/app/pages/analyze/pages/page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/app/analyze/')({
  component: AnalyzePage,
})

