import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageSquare,
  Send,
  Users,
  ArrowLeft,
  ChevronDown,
  Megaphone,
  User,
} from "lucide-react";

interface StaffMessage {
  id: string;
  senderId: string;
  senderName: string | null;
  senderRole: string | null;
  recipientId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function roleColor(role: string | null): string {
  if (role === "manager" || role === "admin") return "text-primary";
  if (role === "technician") return "text-green-600 dark:text-green-400";
  return "text-muted-foreground";
}

function roleBadgeVariant(role: string | null): "default" | "secondary" | "outline" {
  if (role === "manager" || role === "admin") return "default";
  return "secondary";
}

export default function StaffMessages() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const userId = (user as any)?.id || (user as any)?.claims?.sub;
  const userRole = (user as any)?.role || (user as any)?.claims?.role;
  const isManager = userRole === "manager" || userRole === "admin";

  const [newMessage, setNewMessage] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);

  const { data: messages = [], isLoading } = useQuery<StaffMessage[]>({
    queryKey: ["/api/staff/messages"],
    refetchInterval: 10000,
  });

  const { data: staffMembers = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff/members"],
    enabled: isManager,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/staff/messages", {
        message: newMessage,
        recipientId: recipientId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/messages/unread-count"] });
      setNewMessage("");
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/staff/messages/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff/messages/unread-count"] });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-mark unread messages as read when page is open
  useEffect(() => {
    messages
      .filter((m) => !m.isRead && m.senderId !== userId)
      .forEach((m) => readMutation.mutate(m.id));
  }, [messages]);

  const selectedRecipient = staffMembers.find((s) => s.id === recipientId);
  const unreadCount = messages.filter((m) => !m.isRead && m.senderId !== userId).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full flex flex-col">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col flex-1 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <button type="button" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Team Messages
                  {unreadCount > 0 && (
                    <Badge className="text-xs">{unreadCount} new</Badge>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isManager ? "Communicate with your team in real time" : "Direct line to your manager"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3 min-h-[400px] max-h-[60vh] pr-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">No messages yet</p>
                <p className="text-sm text-muted-foreground">
                  {isManager
                    ? "Send a broadcast to all technicians, or message someone directly."
                    : "Your manager hasn't sent any messages yet."}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === userId;
                const isBroadcast = !msg.recipientId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {msg.senderName?.[0]?.toUpperCase() || "?"}
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[78%] space-y-1 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${roleColor(msg.senderRole)}`}>
                          {isMine ? "You" : (msg.senderName || "Staff")}
                        </span>
                        {msg.senderRole && (
                          <Badge variant={roleBadgeVariant(msg.senderRole)} className="text-[10px] px-1.5 py-0">
                            {msg.senderRole}
                          </Badge>
                        )}
                        {isBroadcast && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                            <Megaphone className="w-2.5 h-2.5" />
                            All
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">{timeAgo(msg.createdAt)}</span>
                      </div>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : !msg.isRead && msg.senderId !== userId
                          ? "bg-primary/10 border border-primary/20 rounded-tl-sm"
                          : "bg-muted rounded-tl-sm"
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Compose area */}
          <Card className="shrink-0">
            <CardContent className="py-3 space-y-3">
              {/* Recipient selector (manager only) */}
              {isManager && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRecipientPicker(!showRecipientPicker)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {recipientId ? (
                      <>
                        <User className="w-3.5 h-3.5" />
                        To: <span className="font-semibold text-foreground">{selectedRecipient?.name || "Unknown"}</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        To: <span className="font-semibold text-foreground">All technicians</span>
                      </>
                    )}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <AnimatePresence>
                    {showRecipientPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 rounded-lg border border-border bg-card overflow-hidden"
                      >
                        <button
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 ${!recipientId ? "text-primary font-medium" : ""}`}
                          onClick={() => { setRecipientId(null); setShowRecipientPicker(false); }}
                        >
                          <Users className="w-4 h-4" />
                          All technicians (broadcast)
                        </button>
                        {staffMembers
                          .filter((s) => s.id !== userId)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 ${recipientId === s.id ? "text-primary font-medium" : ""}`}
                              onClick={() => { setRecipientId(s.id); setShowRecipientPicker(false); }}
                            >
                              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                {s.name?.[0]?.toUpperCase() || "?"}
                              </div>
                              {s.name || s.email}
                              {s.role && <span className="text-xs text-muted-foreground">({s.role})</span>}
                            </button>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Message input */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    isManager
                      ? recipientId
                        ? `Message ${selectedRecipient?.name || "staff member"}...`
                        : "Broadcast to all technicians..."
                      : "Message your manager..."
                  }
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                      e.preventDefault();
                      sendMutation.mutate();
                    }
                  }}
                />
                <Button
                  size="icon"
                  disabled={!newMessage.trim() || sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Press Enter to send</p>
            </CardContent>
          </Card>

        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
