import { useState } from "react";
import { MapPin, Phone, User, Search, Navigation } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserLocations, getUserContacts } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function UserTrackingModal({ userId, userName }: { userId: string, userName: string }) {
  const [search, setSearch] = useState("");

  const { data: locations, isLoading: locLoading } = useQuery({
    queryKey: ["tracking-locations", userId],
    queryFn: () => getUserLocations(userId),
  });

  const { data: contacts, isLoading: conLoading } = useQuery({
    queryKey: ["tracking-contacts", userId],
    queryFn: () => getUserContacts(userId),
  });

  const filteredContacts = contacts?.contacts_data?.filter((c: any) => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phones?.some((p: string) => p.includes(search))
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
          <MapPin className="h-3 w-3 mr-1" /> Track
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Navigation className="h-5 w-5 text-indigo-600" />
            Live Tracking: {userName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden p-6 pt-2">
          <Tabs defaultValue="contacts" className="w-full h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Device Contacts
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="flex-1 flex flex-col min-h-[400px]">
              {conLoading ? (
                <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : !contacts ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  No contacts synced yet.
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search contacts by name or number..." 
                      className="pl-9 bg-muted/30"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 border rounded-lg bg-card">
                    {filteredContacts?.length === 0 ? (
                      <p className="text-center py-8 text-sm text-muted-foreground">No contacts match your search.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredContacts?.map((c: any, i: number) => (
                          <div key={i} className="flex items-start justify-between p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-sm">{c.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3" />
                                  {c.phones?.join(', ') || 'No number saved'}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(`tel:${c.phones?.[0]}`)}>
                              Call
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="location" className="flex-1 min-h-[400px]">
              {locLoading ? (
                <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : !locations?.length ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground h-full bg-muted/20 rounded-lg border border-dashed">
                  No location data found.
                </div>
              ) : (
                <div className="border rounded-lg bg-card divide-y divide-border h-full overflow-y-auto">
                  {locations.map((loc: any) => (
                    <div key={loc.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-medium">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(loc.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                      >
                        Open Maps
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
