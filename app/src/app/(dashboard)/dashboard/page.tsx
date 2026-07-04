"use client";

import Link from "next/link";
import { Users, Briefcase, HelpCircle, Video } from "lucide-react";

interface DashboardCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const dashboardCards: DashboardCard[] = [
  {
    title: "Profiles",
    description: "Manage candidate profiles and information",
    href: "/profiles",
    icon: <Users className="w-8 h-8" />,
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Interviews",
    description: "Schedule and manage interviews",
    href: "/interviews",
    icon: <Video className="w-8 h-8" />,
    color: "from-purple-500 to-purple-600",
  },
  {
    title: "Jobs",
    description: "View and manage job postings",
    href: "/jobs",
    icon: <Briefcase className="w-8 h-8" />,
    color: "from-green-500 to-green-600",
  },
  {
    title: "Question Bank",
    description: "Manage interview questions",
    href: "/question-bank",
    icon: <HelpCircle className="w-8 h-8" />,
    color: "from-orange-500 to-orange-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Manage your interview process</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-linear-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              <div className="relative p-6 flex flex-col h-full">
                <div className={`inline-flex w-12 h-12 rounded-lg bg-linear-to-br ${card.color} text-white items-center justify-center mb-4`}>
                  {card.icon}
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {card.title}
                </h2>

                <p className="text-sm text-gray-600 flex-1 mb-4">
                  {card.description}
                </p>

                <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                  Go to {card.title}
                  <span className="ml-2 transform group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
