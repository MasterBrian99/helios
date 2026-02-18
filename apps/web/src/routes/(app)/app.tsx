import Layout from '@/modules/app/layout/layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/app')({
  component: Layout,
})

