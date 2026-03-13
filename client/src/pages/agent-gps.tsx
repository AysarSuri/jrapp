import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAgentLocations, useUpdateAgentLocation, useDeleteAgentLocation } from "@/hooks/use-agent-locations";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { AgentLocation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SearchSelect } from "@/components/search-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Loader2, RefreshCw, Navigation, Smartphone, Tablet, Monitor, Trash2, ExternalLink, Signal,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type UserType = { id: string; username: string; fullName: string; role: string };

function detectDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua) || (ua.includes("android") && !ua.includes("mobile"))) return "tablet";
  if (/iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return "mobile";
  return "desktop";
}

function getDeviceIcon(type: string) {
  switch (type) {
    case "mobile": return Smartphone;
    case "tablet": return Tablet;
    default: return Monitor;
  }
}

function timeAgo(dateStr: string, t: (key: string) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("Just now");
  if (diffMin < 60) return `${diffMin} ${t("min ago")}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${t("hours ago")}`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${t("days ago")}`;
}

export default function AgentGpsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: locations, isLoading } = useAgentLocations();
  const { mutate: updateLocation, isPending: isUpdating } = useUpdateAgentLocation();
  const { mutate: deleteLocation } = useDeleteAgentLocation();
  const isRtl = i18n.language === "ar" || i18n.language === "ckb";

  const { data: agentsList } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const [agentFilter, setAgentFilter] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<AgentLocation | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const agents = (agentsList || []).filter(u => u.role === "sales_rep");
  const allLocations = locations || [];
  const filteredLocations = agentFilter && agentFilter !== "all"
    ? allLocations.filter(l => l.agentUserId === agentFilter)
    : allLocations;

  const isAgent = user?.role === "sales_rep";
  const uniqueAgents = [...new Set(allLocations.map(l => l.agentUserId))];

  const sendLocation = useCallback((position: GeolocationPosition) => {
    if (!user) return;
    const { latitude, longitude, accuracy } = position.coords;
    setMyLocation({ lat: latitude, lng: longitude, accuracy });
    updateLocation({
      agentUserId: user.id,
      agentName: user.fullName || user.username,
      latitude,
      longitude,
      accuracy: accuracy || undefined,
      deviceType: detectDeviceType(),
    });
  }, [user, updateLocation]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: t("GPS not supported on this device"), variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos);
        toast({ title: t("Location sent successfully") });
      },
      (err) => {
        toast({ title: t("Failed to get location") + ": " + err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    const id = navigator.geolocation.watchPosition(
      sendLocation,
      () => {},
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    );
    setWatchId(id);
    setTrackingActive(true);
  }, [sendLocation, toast, t]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTrackingActive(false);
    setMyLocation(null);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const sendOnce = () => {
    if (!navigator.geolocation) {
      toast({ title: t("GPS not supported on this device"), variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos);
        toast({ title: t("Location sent successfully") });
      },
      (err) => {
        toast({ title: t("Failed to get location") + ": " + err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleDelete = (id: number) => {
    deleteLocation(id, {
      onSuccess: () => {
        toast({ title: t("Location deleted successfully") });
      },
      onError: () => {
        toast({ title: t("Failed to delete location"), variant: "destructive" });
      },
    });
  };

  const openInMaps = (lat: string, lng: string) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <MapPin className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            {t('Agent GPS Tracking')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Track agent locations in real-time')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              {t('My Location')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Signal className={`h-4 w-4 ${trackingActive ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{t('Status')}</span>
                    </div>
                    <Badge variant={trackingActive ? "default" : "secondary"} className={trackingActive ? "bg-green-600" : ""}>
                      {trackingActive ? t("Active") : t("Inactive")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {(() => { const DevIcon = getDeviceIcon(detectDeviceType()); return <DevIcon className="h-4 w-4" />; })()}
                    <span>{t(detectDeviceType() === "mobile" ? "Mobile" : detectDeviceType() === "tablet" ? "Tablet" : "Desktop")}</span>
                  </div>
                  {myLocation && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground">{t('Latitude')}: <span className="font-mono">{myLocation.lat.toFixed(6)}</span></p>
                      <p className="text-xs text-muted-foreground">{t('Longitude')}: <span className="font-mono">{myLocation.lng.toFixed(6)}</span></p>
                      <p className="text-xs text-muted-foreground">{t('Accuracy')}: <span className="font-mono">{myLocation.accuracy.toFixed(0)}m</span></p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 justify-center">
                {!trackingActive ? (
                  <Button
                    onClick={startTracking}
                    disabled={isUpdating}
                    className="h-12 text-base gap-2 bg-green-600 hover:bg-green-700"
                    data-testid="button-start-tracking"
                  >
                    {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                    {t('Start Live Tracking')}
                  </Button>
                ) : (
                  <Button
                    onClick={stopTracking}
                    variant="destructive"
                    className="h-12 text-base gap-2"
                    data-testid="button-stop-tracking"
                  >
                    <Signal className="h-5 w-5" />
                    {t('Stop Tracking')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={sendOnce}
                  disabled={isUpdating}
                  className="h-10 gap-2"
                  data-testid="button-send-location"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  {t('Send Location Once')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              {t('Tracking Info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('Total Tracked Agents')}</p>
              <p className="font-bold text-2xl text-blue-600" data-testid="text-total-tracked">{uniqueAgents.length}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('Total Devices')}</p>
              <p className="font-bold text-2xl text-blue-600" data-testid="text-total-devices">{allLocations.length}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span>{t('Mobile')}: {allLocations.filter(l => l.deviceType === "mobile").length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tablet className="h-4 w-4 text-muted-foreground" />
                <span>{t('Tablet')}: {allLocations.filter(l => l.deviceType === "tablet").length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span>{t('Desktop')}: {allLocations.filter(l => l.deviceType === "desktop").length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedLocation && (
        <Card className="border-green-200 dark:border-green-900 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                {t('Location on Map')} — {selectedLocation.agentName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => openInMaps(selectedLocation.latitude, selectedLocation.longitude)}
                  data-testid="button-open-google-maps"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('Open in Google Maps')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLocation(null)}
                  data-testid="button-close-map"
                >
                  ✕
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border" style={{ height: 400 }}>
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}&z=15&output=embed`}
                title="Agent Location Map"
                data-testid="iframe-google-map"
              />
            </div>
            <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
              <span>{t('Latitude')}: <span className="font-mono font-medium text-foreground">{parseFloat(selectedLocation.latitude).toFixed(6)}</span></span>
              <span>{t('Longitude')}: <span className="font-mono font-medium text-foreground">{parseFloat(selectedLocation.longitude).toFixed(6)}</span></span>
              {selectedLocation.accuracy && <span>{t('Accuracy')}: <span className="font-mono font-medium text-foreground">{parseFloat(selectedLocation.accuracy).toFixed(0)}m</span></span>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              {t('Agent Locations')}
              <Badge variant="secondary" className="ml-2">{filteredLocations.length}</Badge>
            </CardTitle>
            <div className="w-56">
              <SearchSelect
                items={agents.map(a => ({ id: a.id, name: a.fullName || a.username }))}
                value={agentFilter}
                onValueChange={(v) => setAgentFilter(v || "all")}
                placeholder={t('All Agents')}
                data-testid="select-filter-agent-location"
                showAllOption
                allOptionLabel={t('All Agents')}
                inputClassName="h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Agent')}</TableHead>
                    <TableHead>{t('Device')}</TableHead>
                    <TableHead>{t('Latitude')}</TableHead>
                    <TableHead>{t('Longitude')}</TableHead>
                    <TableHead>{t('Accuracy')}</TableHead>
                    <TableHead>{t('Last Updated')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((loc, i) => {
                    const DevIcon = getDeviceIcon(loc.deviceType);
                    return (
                      <TableRow key={loc.id} data-testid={`row-agent-location-${loc.id}`}>
                        <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{loc.agentName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DevIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{t(loc.deviceType === "mobile" ? "Mobile" : loc.deviceType === "tablet" ? "Tablet" : "Desktop")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{parseFloat(loc.latitude).toFixed(6)}</TableCell>
                        <TableCell className="font-mono text-sm">{parseFloat(loc.longitude).toFixed(6)}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {loc.accuracy ? `${parseFloat(loc.accuracy).toFixed(0)}m` : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {timeAgo(loc.updatedAt as unknown as string, t)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => setSelectedLocation(loc)}
                              data-testid={`button-map-agent-location-${loc.id}`}
                              title={t('View on Map')}
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => openInMaps(loc.latitude, loc.longitude)}
                              data-testid={`button-external-map-agent-location-${loc.id}`}
                              title={t('Open in Google Maps')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  data-testid={`button-delete-agent-location-${loc.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('This will delete this location record.')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(loc.id)}>{t('Yes')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredLocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {t('No location data yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
