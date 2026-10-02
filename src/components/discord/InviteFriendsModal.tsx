import { useState, useEffect } from "react";
import { Copy, Check, UserPlus, Search, Link } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InviteFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  serverName: string;
  existingMemberIds: string[];
  onInviteUser: (userId: string) => Promise<void>;
}

export function InviteFriendsModal({
  open,
  onOpenChange,
  serverId,
  serverName,
  existingMemberIds,
  onInviteUser,
}: InviteFriendsModalProps) {
  const { friends, loading } = useFriends();
  const [searchQuery, setSearchQuery] = useState("");
  const [invitingUsers, setInvitingUsers] = useState<Set<string>>(new Set());
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Generate invite code (prefixed with TABE)
  const inviteCode = `TABE-${serverId.slice(0, 8).toUpperCase()}`;
  const inviteLink = `${window.location.origin}/tabetalk?invite=${inviteCode}`;

  // Filter friends who are not already members
  const availableFriends = friends.filter(
    (f) => !existingMemberIds.includes(f.friend.user_id)
  );

  const filteredFriends = availableFriends.filter((f) => {
    const name = f.friend.nombre || f.friend.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleInvite = async (userId: string) => {
    setInvitingUsers((prev) => new Set(prev).add(userId));
    try {
      await onInviteUser(userId);
      setInvitedUsers((prev) => new Set(prev).add(userId));
    } finally {
      setInvitingUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setInvitedUsers(new Set());
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#313338] border-none text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Invitar amigos a {serverName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full bg-[#1e1f22] border-none">
            <TabsTrigger
              value="friends"
              className="flex-1 data-[state=active]:bg-[#5865f2] data-[state=active]:text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Amigos
            </TabsTrigger>
            <TabsTrigger
              value="link"
              className="flex-1 data-[state=active]:bg-[#5865f2] data-[state=active]:text-white"
            >
              <Link className="w-4 h-4 mr-2" />
              Enlace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar amigos..."
                className="pl-10 bg-[#1e1f22] border-none text-white placeholder:text-[#949ba4]"
              />
            </div>

            {/* Friends list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {loading ? (
                <div className="text-center py-8 text-[#949ba4]">
                  Cargando amigos...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-[#949ba4]">
                  {availableFriends.length === 0
                    ? "Todos tus amigos ya están en el servidor"
                    : "No se encontraron amigos"}
                </div>
              ) : (
                filteredFriends.map((friendship) => {
                  const friend = friendship.friend;
                  const isInviting = invitingUsers.has(friend.user_id);
                  const isInvited = invitedUsers.has(friend.user_id);

                  return (
                    <div
                      key={friend.user_id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[#35373c] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-[#5865f2] text-white">
                            {(friend.nombre || friend.username || "U")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">
                            {friend.nombre || friend.username || "Usuario"}
                          </p>
                          {friend.username && (
                            <p className="text-xs text-[#949ba4]">
                              @{friend.username}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleInvite(friend.user_id)}
                        disabled={isInviting || isInvited}
                        className={cn(
                          "min-w-[80px]",
                          isInvited
                            ? "bg-[#23a559] hover:bg-[#23a559]"
                            : "bg-[#5865f2] hover:bg-[#4752c4]"
                        )}
                      >
                        {isInviting ? (
                          "..."
                        ) : isInvited ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Enviado
                          </>
                        ) : (
                          "Invitar"
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-4">
            <p className="text-sm text-[#949ba4]">
              Comparte este enlace con tus amigos para que puedan unirse al
              servidor.
            </p>

            {/* Invite link */}
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="bg-[#1e1f22] border-none text-white font-mono text-sm"
              />
              <Button
                onClick={copyInviteLink}
                className={cn(
                  "shrink-0",
                  copied
                    ? "bg-[#23a559] hover:bg-[#23a559]"
                    : "bg-[#5865f2] hover:bg-[#4752c4]"
                )}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Invite code */}
            <div className="p-4 bg-[#1e1f22] rounded-lg">
              <p className="text-xs text-[#949ba4] mb-1">Código de invitación</p>
              <p className="font-mono text-lg text-[#5865f2]">{inviteCode}</p>
            </div>

            <p className="text-xs text-[#949ba4]">
              Este enlace no expira. Los usuarios que lo usen serán agregados
              automáticamente al servidor.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
