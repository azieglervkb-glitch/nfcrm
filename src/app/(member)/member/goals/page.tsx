"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Plus,
  CheckCircle,
  Clock,
  Calendar,
  Loader2,
  Trash2,
} from "lucide-react";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  createdAt: string;
}

export default function MemberGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetDate: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/member/goals");
      if (response.ok) {
        const data = await response.json();
        setGoals(data);
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const response = await fetch("/api/member/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Goal created successfully",
        });
        setDialogOpen(false);
        setFormData({ title: "", description: "", targetDate: "" });
        fetchGoals();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to create goal",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/member/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Goal marked as completed!",
        });
        fetchGoals();
      }
    } catch (error) {
      console.error("Failed to complete goal:", error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/member/goals/${goalId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Goal deleted",
        });
        fetchGoals();
      }
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Goals</h1>
          <p className="text-gray-600">Set and track your S.M.A.R.T. goals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Define a specific, measurable, achievable, relevant, and time-bound goal
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Generate 50 leads this month"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add more details about your goal..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDate: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Goal"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* S.M.A.R.T. Guide */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-100">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">S.M.A.R.T. Goals Framework</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="font-medium text-red-600">S - Specific</p>
              <p className="text-gray-600">Clear and defined</p>
            </div>
            <div>
              <p className="font-medium text-red-600">M - Measurable</p>
              <p className="text-gray-600">Track progress</p>
            </div>
            <div>
              <p className="font-medium text-red-600">A - Achievable</p>
              <p className="text-gray-600">Realistic targets</p>
            </div>
            <div>
              <p className="font-medium text-red-600">R - Relevant</p>
              <p className="text-gray-600">Aligned with vision</p>
            </div>
            <div>
              <p className="font-medium text-red-600">T - Time-bound</p>
              <p className="text-gray-600">Set deadlines</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Active Goals
          </CardTitle>
          <CardDescription>
            {activeGoals.length} goal{activeGoals.length !== 1 ? "s" : ""} in progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              {activeGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 bg-gray-50 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{goal.title}</h4>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {goal.description}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      In Progress
                    </Badge>
                  </div>

                  {goal.targetDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Due: {new Date(goal.targetDate).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleCompleteGoal(goal.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No active goals yet</p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Completed Goals
            </CardTitle>
            <CardDescription>
              {completedGoals.length} goal{completedGoals.length !== 1 ? "s" : ""} achieved
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 bg-green-50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{goal.title}</p>
                      <p className="text-sm text-gray-500">
                        Completed on{" "}
                        {new Date(goal.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
