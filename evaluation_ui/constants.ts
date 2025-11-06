
import { Task, TaskStatus } from './types';

export const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Quarterly Sales Report Analysis',
    description: 'Analyze the sales data from the last quarter and prepare a comprehensive report highlighting key trends, top-performing products, and areas for improvement. The report should include visualizations and be ready for the executive meeting.',
    status: TaskStatus.InProgress,
    dueDate: '2024-08-15',
    assignedBy: 'Jane Doe',
    results: [],
  },
  {
    id: '2',
    title: 'Update Customer Onboarding Documentation',
    description: 'Review and update the customer onboarding documentation to reflect the latest UI changes and new features. Ensure all screenshots are current and the language is clear and concise for new users.',
    status: TaskStatus.InProgress,
    dueDate: '2024-08-20',
    assignedBy: 'John Smith',
    results: [],
  },
  {
    id: '3',
    title: 'Design Mockups for New Mobile App Feature',
    description: 'Create high-fidelity mockups for the new "Social Share" feature in our mobile application. The design should be intuitive, align with our current branding, and cover all user flows from sharing to confirmation.',
    status: TaskStatus.Completed,
    dueDate: '2024-07-30',
    assignedBy: 'Jane Doe',
    results: [
      {
        id: 'res-3-1',
        type: 'link',
        name: 'Figma Mockups',
        url: 'https://figma.com/example',
        addedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: '4',
    title: 'User Acceptance Testing (UAT) for v2.5',
    description: 'Conduct thorough User Acceptance Testing for the upcoming version 2.5 release. Document all bugs, usability issues, and feedback in Jira. Focus on the new dashboard and reporting modules.',
    status: TaskStatus.InProgress,
    dueDate: '2024-08-25',
    assignedBy: 'Emily White',
    results: [],
  },
];
