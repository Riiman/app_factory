import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowUpRight, ArrowDownRight, FileText, Rocket, CheckCircle2, Clock, TrendingUp, Users } from "lucide-react";

const statsData = [
  {
    title: "Total Submissions",
    value: "156",
    change: "+12.5%",
    changeType: "increase",
    description: "from last month",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Pending Reviews",
    value: "23",
    change: "+8.3%",
    changeType: "increase",
    description: "awaiting action",
    icon: Clock,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "Active Startups",
    value: "89",
    change: "+15.2%",
    changeType: "increase",
    description: "from last month",
    icon: Rocket,
    gradient: "from-purple-500 to-purple-600",
  },
  {
    title: "Approved This Month",
    value: "47",
    change: "+23.1%",
    changeType: "increase",
    description: "from last month",
    icon: CheckCircle2,
    gradient: "from-green-500 to-emerald-600",
  },
];

const recentSubmissions = [
  { name: "TechVision AI", status: "pending", time: "2 hours ago", stage: "GTM" },
  { name: "EcoStart Solutions", status: "approved", time: "5 hours ago", stage: "DEPLOY" },
  { name: "FinanceHub Pro", status: "pending", time: "1 day ago", stage: "UX" },
  { name: "HealthTrack Plus", status: "review", time: "2 days ago", stage: "SCOPE" },
];

const upcomingMilestones = [
  { title: "Q4 Review Meeting", date: "Nov 15, 2025", participants: 12 },
  { title: "Investor Pitch Day", date: "Nov 22, 2025", participants: 8 },
  { title: "Demo Day Preparation", date: "Dec 1, 2025", participants: 25 },
];

export function DashboardContent() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with VentureX today.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden border-0 shadow-lg">
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}>
                  <Icon className="size-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={`flex items-center ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.changeType === 'increase' ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {stat.change}
                  </span>
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Latest startup submissions awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSubmissions.map((submission, index) => (
                <div key={index} className="flex items-center gap-4 rounded-lg border p-3 transition-all hover:bg-muted/50">
                  <div className={`flex size-10 items-center justify-center rounded-full ${
                    submission.status === 'approved' ? 'bg-green-100 text-green-600' :
                    submission.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <Rocket className="size-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{submission.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                        submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                        submission.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {submission.status}
                      </span>
                      <span className="text-xs text-muted-foreground">Stage: {submission.stage}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{submission.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
            <CardDescription>Important events and deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMilestones.map((milestone, index) => (
                <div key={index} className="space-y-2 rounded-lg border p-3 transition-all hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground">{milestone.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    <span>{milestone.participants} participants</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <CardDescription>Approval to submission ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">68.5%</span>
                <span className="flex items-center text-sm text-green-600">
                  <TrendingUp className="size-3" />
                  +5.2%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[68.5%] bg-gradient-to-r from-blue-500 to-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Average Review Time</CardTitle>
            <CardDescription>Time to process submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">2.3 days</span>
                <span className="flex items-center text-sm text-green-600">
                  <ArrowDownRight className="size-3" />
                  -0.5d
                </span>
              </div>
              <p className="text-xs text-muted-foreground">12% faster than last month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
            <CardDescription>Startups achieving milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">84.2%</span>
                <span className="flex items-center text-sm text-green-600">
                  <ArrowUpRight className="size-3" />
                  +3.1%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[84.2%] bg-gradient-to-r from-green-500 to-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
