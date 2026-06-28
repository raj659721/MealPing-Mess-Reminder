import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, ShieldCheck, MoreHorizontal, Bell, Search, Trash2, Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/layout";
import { useUserRole } from '@/hooks/use-user-role';
import { useGetAllStudents, useSendGlobalNotification, useUpdateUserRole, useDeleteUser } from '@/lib/api';
import { toast } from "sonner";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserTrackingModal } from "@/components/user-tracking-modal";

export default function SuperAdminPage() {
  const { isSuperAdmin, profile } = useUserRole();
  const { data: students, isLoading, isError } = useGetAllStudents();
  const sendNotificationMutation = useSendGlobalNotification();
  const [search, setSearch] = useState("");
  const [notificationMsg, setNotificationMsg] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();
  
  if (!isSuperAdmin) return null;
  
  // Format students list (which represents all users in the system)
  const mappedUsers = (students || []).map((s: any) => {
    const role = s.role === 'admin' ? 'Admin' : s.role === 'user' ? 'User' : (s.email?.includes('admin') ? 'Admin' : 'User');
    return {
      id: s.id,
      email: s.email,
      role: role,
      dateJoined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: "Active",
    };
  });

  const filteredUsers = mappedUsers.filter((u: any) => 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = mappedUsers.filter((u: any) => u.role === 'User').length;
  const totalAdmins = mappedUsers.filter((u: any) => u.role === 'Admin').length;

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationMsg.trim()) return;

    sendNotificationMutation.mutate(notificationMsg, {
      onSuccess: () => {
        toast.success("Global notification sent to all users!");
        setNotificationMsg("");
        setIsNotificationOpen(false);
      },
      onError: (err) => {
        toast.error("Failed to send notification: " + err.message);
      }
    });
  };

  const handleToggleRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === 'Admin' ? 'user' : 'admin';
    updateRoleMutation.mutate({ userId, role: newRole }, {
      onSuccess: () => toast.success(`User role updated to ${newRole}`),
      onError: (err) => toast.error("Failed to update role: " + err.message)
    });
  };

  const handleRevokeAccess = (userId: string) => {
    if (!window.confirm("Are you sure you want to completely revoke access for this user? This cannot be undone.")) return;
    
    deleteUserMutation.mutate(userId, {
      onSuccess: () => toast.success("User access revoked permanently."),
      onError: (err) => toast.error("Failed to revoke access: " + err.message)
    });
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1200px] mx-auto pb-20 pt-4 px-4 space-y-8"
      >
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage platform access and notify users.</p>
          </div>
          
          <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <DialogTrigger asChild>
              <button className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Send Notification</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Send Global Notification</DialogTitle>
                <DialogDescription>
                  This message will be sent to all users and admins across the platform.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendNotification} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground">Message</Label>
                  <Input
                    id="message"
                    value={notificationMsg}
                    onChange={(e) => setNotificationMsg(e.target.value)}
                    placeholder="Enter announcement here..."
                    required
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={sendNotificationMutation.isPending}
                >
                  {sendNotificationMutation.isPending ? "Broadcasting..." : "Broadcast Message"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Minimal Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Total Regular Users" 
            value={totalUsers.toString()} 
            icon={Users} 
            iconColor="text-blue-500" 
            iconBg="bg-blue-50 dark:bg-blue-500/10" 
          />
          <StatCard 
            title="Total Administrators" 
            value={totalAdmins.toString()} 
            icon={ShieldCheck} 
            iconColor="text-amber-500" 
            iconBg="bg-amber-50 dark:bg-amber-500/10" 
          />
        </div>

        {/* ── User Data Table ── */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Table Header/Toolbar */}
          <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
            <h3 className="font-semibold text-foreground text-lg">All Platform Users</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border text-foreground text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
          
          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                <tr>
                  <th className="px-6 py-4 font-medium">Email Address</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Date Joined</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Track</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading users...</td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-destructive">Failed to load users.</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border",
                          user.role === 'Admin' 
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" 
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {user.dateJoined}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          {user.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <UserTrackingModal userId={user.id} userName={user.email.split('@')[0]} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                            <MoreHorizontal className="h-5 w-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => handleToggleRole(user.id, user.role)} className="cursor-pointer text-foreground hover:bg-muted flex items-center gap-2">
                              <Edit className="h-4 w-4" /> {user.role === 'Admin' ? 'Demote to User' : 'Make Admin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRevokeAccess(user.id)} className="cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 flex items-center gap-2">
                              <Trash2 className="h-4 w-4" /> Revoke Access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg }: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
      <div className={cn("p-4 rounded-xl", iconBg)}>
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>
      <div>
        <h2 className="text-3xl font-bold text-foreground">{value}</h2>
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
    </div>
  );
}
