import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const submissions = [
  {
    id: 1,
    startupName: "VentureXit",
    status: "pending",
    submittedAt: "1/11/2025",
    actions: ["SCOPE", "GTM", "UX", "SPRINT", "DEPLOY", "MONETIZE", "FUNDRAISE"],
  },
  {
    id: 2,
    startupName: "TechNova Labs",
    status: "in-review",
    submittedAt: "1/10/2025",
    actions: ["SCOPE", "GTM", "UX", "SPRINT", "DEPLOY", "MONETIZE", "FUNDRAISE"],
  },
  {
    id: 3,
    startupName: "CloudScale Pro",
    status: "approved",
    submittedAt: "1/9/2025",
    actions: ["SCOPE", "GTM", "UX", "SPRINT", "DEPLOY", "MONETIZE", "FUNDRAISE"],
  },
  {
    id: 4,
    startupName: "DataFlow AI",
    status: "pending",
    submittedAt: "1/8/2025",
    actions: ["SCOPE", "GTM", "UX", "SPRINT", "DEPLOY", "MONETIZE", "FUNDRAISE"],
  },
  {
    id: 5,
    startupName: "GreenTech Solutions",
    status: "in-review",
    submittedAt: "1/7/2025",
    actions: ["SCOPE", "GTM", "UX", "SPRINT", "DEPLOY", "MONETIZE", "FUNDRAISE"],
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    case "in-review":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    case "approved":
      return "bg-green-100 text-green-700 hover:bg-green-100";
    default:
      return "bg-gray-100 text-gray-700 hover:bg-gray-100";
  }
};

export function SubmissionsContent() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Submissions for Review</h1>
          <p className="text-muted-foreground">Review and manage startup submissions</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          Export Data
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>
            {submissions.length} submissions awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Startup Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{submission.startupName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{submission.submittedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {submission.actions.map((action) => (
                          <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            className="h-7 border-blue-200 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Pending</CardTitle>
            <CardDescription>Awaiting initial review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {submissions.filter(s => s.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>In Review</CardTitle>
            <CardDescription>Currently being evaluated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {submissions.filter(s => s.status === "in-review").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Approved</CardTitle>
            <CardDescription>Ready for next steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {submissions.filter(s => s.status === "approved").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
