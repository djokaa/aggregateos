"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@aggregateos/ui";
import {
  ArrowLeft,
  Plus,
  Search,
  Shield,
  UserPlus,
  MoreHorizontal,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

// --- Mock Data ---

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
  avatar: string;
}

const mockUsers: MockUser[] = [
  { id: "1", name: "Ivan Martinez", email: "ivan@rylandlogistics.com", role: "platform_admin", status: "active", lastLogin: "2 hours ago", avatar: "IM" },
  { id: "2", name: "Sarah Johnson", email: "sarah@rylandlogistics.com", role: "entity_gm", status: "active", lastLogin: "1 day ago", avatar: "SJ" },
  { id: "3", name: "Mike Thompson", email: "mike@rylandlogistics.com", role: "dispatcher", status: "active", lastLogin: "3 hours ago", avatar: "MT" },
  { id: "4", name: "Emily Davis", email: "emily@rylandlogistics.com", role: "finance", status: "active", lastLogin: "5 hours ago", avatar: "ED" },
  { id: "5", name: "Tommy Williams", email: "tommy@rylandlogistics.com", role: "driver", status: "active", lastLogin: "30 min ago", avatar: "TW" },
  { id: "6", name: "Carlos Rivera", email: "carlos@rylandlogistics.com", role: "driver", status: "active", lastLogin: "1 hour ago", avatar: "CR" },
  { id: "7", name: "Jake Wilson", email: "jake@rylandlogistics.com", role: "driver", status: "inactive", lastLogin: "2 weeks ago", avatar: "JW" },
  { id: "8", name: "Lisa Chen", email: "lisa@rylandlogistics.com", role: "customer", status: "active", lastLogin: "1 day ago", avatar: "LC" },
];

const roleVariant: Record<string, "error" | "purple" | "info" | "success" | "warning"> = {
  platform_admin: "error",
  entity_gm: "purple",
  dispatcher: "info",
  driver: "success",
  customer: "warning",
  finance: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
};

const roleLabels: Record<string, string> = {
  platform_admin: "Platform Admin",
  entity_gm: "Entity GM",
  dispatcher: "Dispatcher",
  driver: "Driver",
  customer: "Customer",
  finance: "Finance",
};

const rolePermissions = [
  { role: "Platform Admin", description: "Full system access across all entities", color: "text-red-600" },
  { role: "Entity GM", description: "Manage operations for assigned entity", color: "text-purple-600" },
  { role: "Dispatcher", description: "Create and assign loads, manage drivers", color: "text-blue-600" },
  { role: "Driver", description: "View loads, update status, upload tickets", color: "text-green-600" },
  { role: "Customer", description: "View orders, estimates, invoices", color: "text-amber-600" },
  { role: "Finance", description: "Manage invoicing, reports, payments", color: "text-indigo-600" },
];

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteRole) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviteRole("");
    setInviteOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage users, roles, and permissions &middot; {mockUsers.length} users
            </p>
          </div>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="platform_admin">Platform Admin</SelectItem>
            <SelectItem value="entity_gm">Entity GM</SelectItem>
            <SelectItem value="dispatcher">Dispatcher</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600">
                        {user.avatar}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[user.role] ?? "secondary"}>
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "success" : "secondary"}>
                      {user.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLogin}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toast.info(`Edit role for ${user.name}`)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            toast.info(
                              user.status === "active"
                                ? `${user.name} deactivated`
                                : `${user.name} activated`
                            )
                          }
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => toast.error(`${user.name} removed`)}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Role Permissions
          </CardTitle>
          <CardDescription>
            Overview of what each role can access and manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rolePermissions.map((perm) => (
              <div key={perm.role} className="rounded-lg border p-3">
                <p className={`text-sm font-semibold ${perm.color}`}>{perm.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">{perm.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="entity_gm">Entity GM</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite}>
              <Plus className="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
