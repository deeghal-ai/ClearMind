<script>
  import { Bell, Home, FileText, BarChart3, Calendar, Settings, Camera, Search, Users, Bike, Zap, Activity, ArrowRight, MessageCircle, MapPin, Play } from 'lucide-svelte'
  
  let activeTab = $state('Activities')
  let selectedPeriod = $state('monthly')
  
  const friends = [
    { name: "Max Stone", status: "Weekly Bicycle", time: "1 hr ago", avatar: "MS" },
    { name: "Grisha Jack", status: "Daily Jogging", time: "2 min ago", avatar: "GJ" },
    { name: "Lexi Patrick", status: "Evening Walk", time: "5 min ago", avatar: "LP" },
    { name: "Cody Bryan", status: "Quick Sprint", time: "17 min ago", avatar: "CB" },
    { name: "Max Stone", status: "Cycling", time: "1 hour ago", avatar: "MS" },
  ]
  
  const activities = [
    { name: "Bicycle Drill", distance: "36 km 2 weeks", progress: 45, completed: "17 / 36km", timeLeft: "2 days left", icon: Bike },
    { name: "Jogging Hero", distance: "12 km / week", progress: 13, completed: "2 / 12km", timeLeft: "17 days left", icon: Zap },
    { name: "Healthy Busy", distance: "1000 steps / week", progress: 50, completed: "500 / 1000 steps", timeLeft: "3 days left", icon: Activity },
  ]
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]
</script>

<div class="min-h-screen bg-gradient-to-br from-emerald-200 via-teal-300 to-cyan-400 p-6">
  <div class="mx-auto max-w-7xl">
    <div class="grid grid-cols-12 gap-6 rounded-3xl bg-white/90 backdrop-blur-sm p-6 shadow-2xl">
      
      <!-- Left Sidebar -->
      <div class="col-span-2">
        <div class="flex flex-col items-center space-y-6 rounded-2xl bg-gradient-to-b from-teal-500 to-cyan-700 p-4 h-full">
          <button class="text-white hover:bg-white/20 rounded-xl p-2 transition-colors">
            <Bell class="h-5 w-5" />
          </button>
          <button class="text-white hover:bg-white/20 rounded-xl bg-white/20 p-2 transition-colors">
            <Home class="h-5 w-5" />
          </button>
          <button class="text-white hover:bg-white/20 rounded-xl p-2 transition-colors">
            <FileText class="h-5 w-5" />
          </button>
          <button class="text-white hover:bg-white/20 rounded-xl p-2 transition-colors">
            <BarChart3 class="h-5 w-5" />
          </button>
          <button class="text-white hover:bg-white/20 rounded-xl p-2 transition-colors">
            <Calendar class="h-5 w-5" />
          </button>
          <button class="text-white hover:bg-white/20 rounded-xl p-2 transition-colors">
            <Settings class="h-5 w-5" />
          </button>
          <div class="flex-1"></div>
          <button class="text-white hover:bg-white/20 rounded-xl p-2 transition-colors">
            <Camera class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="col-span-7 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Primary</p>
            <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div class="flex items-center space-x-4">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search" 
                class="pl-10 w-64 rounded-full bg-gray-100 border-0 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div class="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-white font-semibold">
              JD
            </div>
          </div>
        </div>

        <!-- Overview Card -->
        <div class="rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-700 text-white border-0 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold">Overview</h2>
            <select 
              bind:value={selectedPeriod}
              class="w-32 bg-white/20 border-white/30 text-white rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div class="relative mb-8">
            <!-- Chart placeholder with wavy line -->
            <div class="h-32 flex items-center justify-center relative">
              <svg class="w-full h-full" viewBox="0 0 400 100">
                <path
                  d="M0,50 Q100,20 200,50 T400,50"
                  stroke="rgba(255,255,255,0.3)"
                  stroke-width="2"
                  fill="none"
                />
                <path
                  d="M0,60 Q100,30 200,60 T400,60"
                  stroke="rgba(255,255,255,0.6)"
                  stroke-width="3"
                  fill="none"
                />
              </svg>
              <div class="absolute right-20 top-4 bg-white/20 rounded-full p-3">
                <div class="w-4 h-4 bg-emerald-400 rounded-full"></div>
              </div>
              <div class="absolute right-16 top-0 bg-white/90 text-teal-700 px-3 py-1 rounded-lg text-sm font-semibold">
                9,178
                <br />
                <span class="text-xs">Steps</span>
              </div>
            </div>

            <!-- Month labels -->
            <div class="flex justify-between text-xs text-white/70 mt-4">
              {#each months as month}
                <span class={month === 'Apr' ? 'bg-white/20 px-2 py-1 rounded' : ''}>{month}</span>
              {/each}
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-white/70 text-sm">Total Time</p>
              <p class="text-2xl font-bold">748 Hr</p>
              <p class="text-white/70 text-sm">April</p>
            </div>
            <div class="text-center">
              <p class="text-white/70 text-sm">Total Steps</p>
              <p class="text-2xl font-bold">9,178 St</p>
              <p class="text-white/70 text-sm">April</p>
            </div>
            <div class="text-center">
              <p class="text-white/70 text-sm">Target</p>
              <p class="text-2xl font-bold">9,200 St</p>
              <p class="text-white/70 text-sm">April</p>
            </div>
          </div>
        </div>

        <!-- Activity Cards Row -->
        <div class="grid grid-cols-2 gap-6">
          <div class="rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-700 text-white border-0 p-6 flex items-center space-x-4">
            <div class="bg-white/20 rounded-2xl p-3">
              <Activity class="h-8 w-8" />
            </div>
            <div>
              <h3 class="font-semibold text-lg">Daily Jogging</h3>
            </div>
          </div>

          <div class="rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white border-0 p-6">
            <div class="flex items-center justify-between">
              <div class="bg-white/20 rounded-2xl p-3">
                <Zap class="h-8 w-8" />
              </div>
              <ArrowRight class="h-6 w-6" />
            </div>
            <div class="mt-4">
              <h3 class="font-semibold text-lg">My Jogging</h3>
              <p class="text-sm text-white/80">Total Time</p>
              <p class="text-2xl font-bold">748 hr</p>
              <p class="text-sm text-white/80">July</p>
            </div>
          </div>
        </div>

        <!-- Bottom Activity Cards -->
        <div class="grid grid-cols-3 gap-4">
          {#each activities as activity}
            <div class="rounded-2xl border-0 bg-gray-50 p-4 text-center">
              <div class="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-3 w-fit mx-auto mb-4">
                <activity.icon class="h-6 w-6 text-white" />
              </div>
              <h3 class="font-semibold text-gray-900 mb-1">{activity.name}</h3>
              <p class="text-sm text-gray-500 mb-3">{activity.distance}</p>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Progress</span>
                  <span class="font-semibold">{activity.progress}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
                    style="width: {activity.progress}%"
                  ></div>
                </div>
                <div class="flex justify-between text-xs text-gray-400">
                  <span>{activity.completed}</span>
                  <span class="text-red-400">{activity.timeLeft}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Right Sidebar -->
      <div class="col-span-3 space-y-6">
        <!-- Friends Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Users class="h-5 w-5 text-gray-500" />
            <span class="font-semibold text-gray-900">Friends</span>
          </div>
          <button class="text-teal-600 hover:text-teal-700 text-sm font-medium">
            View All
          </button>
        </div>

        <!-- Activity Toggle -->
        <div class="flex space-x-2">
          <button
            class="rounded-full px-4 py-2 text-sm font-medium transition-colors {activeTab === 'Activities' ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white' : 'text-gray-600 hover:text-gray-800'}"
            onclick={() => activeTab = 'Activities'}
          >
            Activities
          </button>
          <button
            class="rounded-full px-4 py-2 text-sm font-medium transition-colors {activeTab === 'Online' ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white' : 'text-gray-600 hover:text-gray-800'}"
            onclick={() => activeTab = 'Online'}
          >
            Online
          </button>
        </div>

        <!-- Friends List -->
        <div class="space-y-4">
          {#each friends as friend}
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="h-10 w-10 rounded-full bg-gradient-to-br from-teal-100 to-cyan-200 text-teal-700 flex items-center justify-center font-semibold text-sm">
                  {friend.avatar}
                </div>
                <div>
                  <p class="font-medium text-gray-900">{friend.name}</p>
                  <p class="text-sm text-gray-500">{friend.status}</p>
                  <p class="text-xs text-gray-400">{friend.time}</p>
                </div>
              </div>
              <button class="text-gray-400 hover:text-gray-600 p-1">
                <MessageCircle class="h-4 w-4" />
              </button>
            </div>
          {/each}
        </div>

        <!-- Live Map -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <MapPin class="h-5 w-5 text-gray-500" />
              <span class="font-semibold text-gray-900">Live map</span>
            </div>
            <button class="text-teal-600 hover:text-teal-700 text-sm font-medium">
              View
            </button>
          </div>

          <div class="rounded-2xl border-0 bg-gray-100 overflow-hidden">
            <div class="p-0 relative h-32">
              <div class="absolute inset-0 bg-gradient-to-br from-emerald-200 to-cyan-200 flex items-center justify-center">
                <div class="text-gray-500 text-sm">Map View</div>
              </div>
              <div class="absolute bottom-2 left-2 flex space-x-1">
                <div class="h-6 w-6 border-2 border-white rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-white text-xs font-semibold">
                  MS
                </div>
                <div class="h-6 w-6 border-2 border-white rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-semibold">
                  GJ
                </div>
              </div>
              <div class="absolute top-2 right-2">
                <button class="h-8 w-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-full flex items-center justify-center transition-colors">
                  <Play class="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
