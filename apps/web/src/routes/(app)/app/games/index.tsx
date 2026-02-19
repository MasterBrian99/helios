import GamesPage from '@/modules/app/pages/games/pages.page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)/app/games/')({
  component: GamesPage,
})

