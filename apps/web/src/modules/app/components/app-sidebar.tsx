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
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BookOpen01Icon,
  Cards02Icon,
  DashboardSquare01Icon,
  LayoutBottomIcon,
  PencilEdit02Icon,
  Robot02Icon,
} from "@hugeicons/core-free-icons"
import { Link } from "@tanstack/react-router"

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/app",
    icon: DashboardSquare01Icon,
    isActive: true,
  },
  {
    title: "Play",
    href: "/app/play",
    icon: BookOpen01Icon,
  },
  {
    title: "Puzzles",
    href: "/app",
    icon: PencilEdit02Icon,
  },
  {
    title: "Analyze",
    href: "/app/analyze",
    icon: Cards02Icon,
  },
  {
    title: "Social",
    href: "/app",
    icon: Robot02Icon,
  },
]


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Documentation</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2">
          {sidebarItems.map((item) => (
            <SidebarMenuItem key={item.title} >
              <SidebarMenuButton asChild size="lg" >
                <Link to={item.href} activeOptions={{ exact: true }} activeProps={{
                  style: {
                    fontWeight: 'bold',
                  
                  },
                }}>
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-5" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* <div className="p-1">
          <SidebarOptInForm />
        </div> */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
