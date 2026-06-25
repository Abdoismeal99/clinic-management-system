import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, User, Activity, Pill, FileText, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = { current: 0 as any };
  const update = useCallback((v: T) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(v), delay);
  }, [delay]);
  // Use effect-like pattern: update on value change
  if (value !== debounced) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(value), delay);
  }
  return debounced;
}

export default function Search() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 350);

  const { data, isLoading, isFetching } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const patients = data?.patients ?? [];
  const visits = data?.visits ?? [];
  const prescriptions = data?.prescriptions ?? [];
  const total = patients.length + visits.length + prescriptions.length;
  const loading = (isLoading || isFetching) && debouncedQuery.length >= 2;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><SearchIcon className="w-6 h-6 text-primary" /> Advanced Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Search across patients, visits, prescriptions, diagnoses, and more</p>
      </div>

      {/* Search Box */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by patient name, ID, phone, diagnosis, medicine, doctor, notes..."
          className="pl-12 h-12 text-base"
          autoFocus
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Hints */}
      {!query && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: <User className="w-4 h-4" />, label: "Patient Name or ID", example: "John Smith or P-001" },
            { icon: <Activity className="w-4 h-4" />, label: "Diagnosis", example: "Hypertension, Diabetes" },
            { icon: <Pill className="w-4 h-4" />, label: "Medicine", example: "Metformin, Aspirin" },
            { icon: <FileText className="w-4 h-4" />, label: "Doctor Notes", example: "Keywords from notes" },
            { icon: <Calendar className="w-4 h-4" />, label: "Phone Number", example: "+1 555 000 0000" },
            { icon: <SearchIcon className="w-4 h-4" />, label: "Disease Tags", example: "Chronic, Acute" },
          ].map((hint) => (
            <div key={hint.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">{hint.icon}</div>
              <div>
                <p className="text-xs font-medium">{hint.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hint.example}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {debouncedQuery.length >= 2 && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : total === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No results for "{debouncedQuery}"</p>
              <p className="text-sm mt-1">Try different keywords or check the spelling</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Found <strong className="text-foreground">{total}</strong> results for "{debouncedQuery}"</p>
              </div>

              <Tabs defaultValue={patients.length > 0 ? "patients" : visits.length > 0 ? "visits" : "prescriptions"}>
                <TabsList className="h-9">
                  <TabsTrigger value="patients" className="text-sm gap-1.5">
                    <User className="w-3.5 h-3.5" /> Patients <Badge variant="secondary" className="ml-1 text-xs">{patients.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="visits" className="text-sm gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Visits <Badge variant="secondary" className="ml-1 text-xs">{visits.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="prescriptions" className="text-sm gap-1.5">
                    <Pill className="w-3.5 h-3.5" /> Prescriptions <Badge variant="secondary" className="ml-1 text-xs">{prescriptions.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                {/* Patients Results */}
                <TabsContent value="patients" className="mt-3">
                  <Card>
                    <CardContent className="p-0">
                      {patients.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No patients found</p>
                      ) : (
                        <div className="divide-y divide-border">
                          {patients.map((p: any) => (
                            <button key={p.id} className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left" onClick={() => navigate(`/patients/${p.id}`)}>
                              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{p.fullName}</p>
                                  <Badge variant="outline" className="text-xs">{p.patientId}</Badge>
                                  {p.status && <Badge variant="secondary" className="text-xs capitalize">{p.status}</Badge>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                                  {p.dateOfBirth && <p className="text-xs text-muted-foreground">DOB: {format(new Date(p.dateOfBirth), "MMM d, yyyy")}</p>}
                                  {p.bloodType && <Badge variant="secondary" className="text-xs">{p.bloodType}</Badge>}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Visits Results */}
                <TabsContent value="visits" className="mt-3">
                  <Card>
                    <CardContent className="p-0">
                      {visits.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No visits found</p>
                      ) : (
                        <div className="divide-y divide-border">
                          {visits.map((v: any) => (
                            <button key={v.id} className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left" onClick={() => navigate(`/patients/${v.patientId}`)}>
                              <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                <Activity className="w-4 h-4 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{v.patientName ?? `Patient #${v.patientId}`}</p>
                                  {v.diagnosisText && <Badge variant="outline" className="text-xs">{v.diagnosisText}</Badge>}
                                  {v.status && <Badge variant="secondary" className="text-xs capitalize">{v.status}</Badge>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {v.visitDate && <p className="text-xs text-muted-foreground">{format(new Date(v.visitDate), "MMM d, yyyy")}</p>}
                                  {v.chiefComplaint && <p className="text-xs text-muted-foreground truncate max-w-xs">{v.chiefComplaint}</p>}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Prescriptions Results */}
                <TabsContent value="prescriptions" className="mt-3">
                  <Card>
                    <CardContent className="p-0">
                      {prescriptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No prescriptions found</p>
                      ) : (
                        <div className="divide-y divide-border">
                          {prescriptions.map((rx: any) => (
                            <button key={rx.id} className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left" onClick={() => navigate(`/patients/${rx.patientId}`)}>
                              <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <Pill className="w-4 h-4 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{rx.patientName ?? `Patient #${rx.patientId}`}</p>
                                  {rx.medicineName && <Badge variant="outline" className="text-xs">{rx.medicineName}</Badge>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {rx.dose && <p className="text-xs text-muted-foreground">{rx.dose}</p>}
                                  {rx.frequency && <p className="text-xs text-muted-foreground">{rx.frequency}</p>}
                                  {rx.createdAt && <p className="text-xs text-muted-foreground">{format(new Date(rx.createdAt), "MMM d, yyyy")}</p>}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}
    </div>
  );
}
