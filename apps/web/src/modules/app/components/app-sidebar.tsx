"use client"

import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  Chess01Icon,
  Target01Icon,
  PuzzleIcon,
  Brain01Icon,
  BookOpen01Icon,
  Book01Icon,
  TeacherIcon,
  Certificate01Icon,
  Analytics01Icon,
  AccountSetting01Icon,
  HelpCircleIcon,
  Dumbbell01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { Link } from "@tanstack/react-router"

// Sidebar navigation items with nested children for collapsible sections
const sidebarItems = [
  {
    title: "Dashboard",
    href: "/app",
    icon: DashboardSquare01Icon,
  },
  {
    title: "My Games",
    href: "/app/games",
    icon: Chess01Icon,
  },
  {
    title: "Training",
    icon: Target01Icon,
    children: [
      { title: "Exercises", href: "/app/training/exercises", icon: Dumbbell01Icon },
      { title: "Puzzles", href: "/app/training/puzzles", icon: PuzzleIcon },
      { title: "Patterns", href: "/app/training/patterns", icon: Brain01Icon },
    ],
  },
  {
    title: "Learning",
    icon: BookOpen01Icon,
    children: [
      { title: "Openings", href: "/app/learning/openings", icon: Book01Icon },
      { title: "AI Tutor", href: "/app/learning/ai-tutor", icon: TeacherIcon },
      { title: "Lessons", href: "/app/learning/lessons", icon: Certificate01Icon },
    ],
  },
  {
    title: "Analytics",
    href: "/app/analyze",
    icon: Analytics01Icon,
  },
  {
    title: "Settings",
    href: "/app/settings",
    icon: AccountSetting01Icon,
  },
  {
    title: "Help",
    href: "/app/help",
    icon: HelpCircleIcon,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/app">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <HugeiconsIcon icon={Chess01Icon} strokeWidth={2} className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Helios Chess</span>
                  <span className="text-xs text-muted-foreground">Chess Training Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2">
          {sidebarItems.map((item) =>
            item.children ? (
              <Collapsible key={item.title} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton size="lg">
                      {item.icon && (
                        <HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-5" />
                      )}
                      <span>{item.title}</span>
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        strokeWidth={2}
                        className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub >
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.title} >
                          <SidebarMenuSubButton asChild className="h-12 text-sm group-data-[collapsible=icon]:p-0!" >
                            <Link to={child.href} activeOptions={{ exact: true }} activeProps={{
                              style: {
                                fontWeight: 'bold',

                              },
                            }}>
                              {child.icon && (
                                <HugeiconsIcon icon={child.icon} strokeWidth={2} className="size-4" />
                              )}
                              <span>{child.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title} >
                <SidebarMenuButton asChild size="lg">
                  <Link
                    to={item.href!}
                    activeOptions={{ exact: true }} activeProps={{
                      style: {
                        fontWeight: 'bold',

                      },
                    }}
                  >
                    {item.icon && (
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-5" />
                    )}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Footer content can be added here */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
