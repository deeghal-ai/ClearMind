"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bell,
  Home,
  FileText,
  BarChart3,
  Calendar,
  Settings,
  Camera,
  Search,
  Users,
  Bike,
  Zap,
  Activity,
  ArrowRight,
  MessageCircle,
  MapPin,
  Play,
} from "lucide-react"

export default function Component() {
  const [activeTab, setActiveTab] = useState("Activities")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-12 gap-6 rounded-3xl bg-white/90 backdrop-blur-sm p-6 shadow-2xl">
          {/* Left Sidebar */}
          <div className="col-span-2">
            <div className="flex flex-col items-center space-y-6 rounded-2xl bg-gradient-to-b from-purple-500 to-purple-700 p-4 h-full">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl bg-white/20">
                <Home className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl">
                <FileText className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl">
                <BarChart3 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl">
                <Calendar className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl">
                <Camera className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-7 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Primary</p>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input placeholder="Search" className="pl-10 w-64 rounded-full bg-gray-100 border-0" />
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Overview Card */}
            <Card className="rounded-3xl bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Overview</h2>
                  <Select defaultValue="monthly">
                    <SelectTrigger className="w-32 bg-white/20 border-white/30 text-white rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative mb-8">
                  {/* Chart placeholder with wavy line */}
                  <div className="h-32 flex items-center justify-center relative">
                    <svg className="w-full h-full" viewBox="0 0 400 100">
                      <path
                        d="M0,50 Q100,20 200,50 T400,50"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d="M0,60 Q100,30 200,60 T400,60"
                        stroke="rgba(255,255,255,0.6)"
                        strokeWidth="3"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute right-20 top-4 bg-white/20 rounded-full p-3">
                      <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                    </div>
                    <div className="absolute right-16 top-0 bg-white/90 text-purple-700 px-3 py-1 rounded-lg text-sm font-semibold">
                      9,178
                      <br />
                      <span className="text-xs">Steps</span>
                    </div>
                  </div>

                  {/* Month labels */}
                  <div className="flex justify-between text-xs text-white/70 mt-4">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((month) => (
                      <span key={month} className={month === "Apr" ? "bg-white/20 px-2 py-1 rounded" : ""}>
                        {month}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-white/70 text-sm">Total Time</p>
                    <p className="text-2xl font-bold">748 Hr</p>
                    <p className="text-white/70 text-sm">April</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/70 text-sm">Total Steps</p>
                    <p className="text-2xl font-bold">9,178 St</p>
                    <p className="text-white/70 text-sm">April</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/70 text-sm">Target</p>
                    <p className="text-2xl font-bold">9,200 St</p>
                    <p className="text-white/70 text-sm">April</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Cards Row */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="rounded-3xl bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0">
                <CardContent className="p-6 flex items-center space-x-4">
                  <div className="bg-white/20 rounded-2xl p-3">
                    <Activity className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Daily Jogging</h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl bg-gradient-to-br from-pink-400 to-pink-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="bg-white/20 rounded-2xl p-3">
                      <Zap className="h-8 w-8" />
                    </div>
                    <ArrowRight className="h-6 w-6" />
                  </div>
                  <div className="mt-4">
                    <h3 className="font-semibold text-lg">My Jogging</h3>
                    <p className="text-sm text-white/80">Total Time</p>
                    <p className="text-2xl font-bold">748 hr</p>
                    <p className="text-sm text-white/80">July</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Activity Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="rounded-2xl border-0 bg-gray-50">
                <CardContent className="p-4 text-center">
                  <div className="bg-purple-500 rounded-2xl p-3 w-fit mx-auto mb-4">
                    <Bike className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Bicycle Drill</h3>
                  <p className="text-sm text-gray-500 mb-3">36 km 2 weeks</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-semibold">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>17 / 36km</span>
                      <span className="text-red-400">2 days left</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 bg-gray-50">
                <CardContent className="p-4 text-center">
                  <div className="bg-purple-500 rounded-2xl p-3 w-fit mx-auto mb-4">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Jogging Hero</h3>
                  <p className="text-sm text-gray-500 mb-3">12 km / week</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-semibold">13%</span>
                    </div>
                    <Progress value={13} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>2 / 12km</span>
                      <span className="text-red-400">17 days left</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 bg-gray-50">
                <CardContent className="p-4 text-center">
                  <div className="bg-purple-500 rounded-2xl p-3 w-fit mx-auto mb-4">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Healthy Busy</h3>
                  <p className="text-sm text-gray-500 mb-3">1000 steps / week</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-semibold">50%</span>
                    </div>
                    <Progress value={50} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>500 / 1000 steps</span>
                      <span className="text-red-400">3 days left</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-3 space-y-6">
            {/* Friends Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-500" />
                <span className="font-semibold text-gray-900">Friends</span>
              </div>
              <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                View All
              </Button>
            </div>

            {/* Activity Toggle */}
            <div className="flex space-x-2">
              <Button
                variant={activeTab === "Activities" ? "default" : "ghost"}
                size="sm"
                className={`rounded-full ${activeTab === "Activities" ? "bg-purple-600 text-white" : "text-gray-600"}`}
                onClick={() => setActiveTab("Activities")}
              >
                Activities
              </Button>
              <Button
                variant={activeTab === "Online" ? "default" : "ghost"}
                size="sm"
                className={`rounded-full ${activeTab === "Online" ? "bg-purple-600 text-white" : "text-gray-600"}`}
                onClick={() => setActiveTab("Online")}
              >
                Online
              </Button>
            </div>

            {/* Friends List */}
            <div className="space-y-4">
              {[
                { name: "Max Stone", status: "Weekly Bicycle", time: "1 hr ago", avatar: "MS" },
                { name: "Grisha Jack", status: "Daily Jogging", time: "2 min ago", avatar: "GJ" },
                { name: "Lexi Patrick", status: "Evening Walk", time: "5 min ago", avatar: "LP" },
                { name: "Cody Bryan", status: "Quick Sprint", time: "17 min ago", avatar: "CB" },
                { name: "Max Stone", status: "Cycling", time: "1 hour ago", avatar: "MS" },
              ].map((friend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-purple-100 text-purple-600">{friend.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{friend.name}</p>
                      <p className="text-sm text-gray-500">{friend.status}</p>
                      <p className="text-xs text-gray-400">{friend.time}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Live Map */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <span className="font-semibold text-gray-900">Live map</span>
                </div>
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                  View
                </Button>
              </div>

              <Card className="rounded-2xl border-0 bg-gray-100 overflow-hidden">
                <CardContent className="p-0 relative h-32">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-200 to-blue-200 flex items-center justify-center">
                    <div className="text-gray-500 text-sm">Map View</div>
                  </div>
                  <div className="absolute bottom-2 left-2 flex space-x-1">
                    <Avatar className="h-6 w-6 border-2 border-white">
                      <AvatarFallback className="text-xs">MS</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-6 w-6 border-2 border-white">
                      <AvatarFallback className="text-xs">GJ</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button size="icon" className="h-8 w-8 bg-red-500 hover:bg-red-600 rounded-full">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
