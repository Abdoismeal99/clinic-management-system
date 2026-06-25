import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon, User, Stethoscope, Pill, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

export default function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading } = trpc.search.global.useQuery({ query: debouncedQuery }, { enabled: debouncedQuery.length >= 2 });
  const hasResults = data && (data.patients.length > 0 || data.visits.length > 0 || data.prescriptions.length > 0);
  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div><h1 className="text-2xl font-bold text-foreground">Global Search</h1><p className="text-sm text-muted-foreground mt-0.5">Search across patients, visits, and prescriptions</p></div>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, ID, phone, diagnosis, medicine..." className="pl-9 h-11 text-base" autoFocus />
      </div>
      {debouncedQuery.length >= 2 && isLoading && <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      {debouncedQuery.length >= 2 && !isLoading && !hasResults && <div className="text-center py-12 text-muted-foreground"><SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>No results found for "<strong>{debouncedQuery}</strong>"</p></div>}
      {hasResults && (
        <div className="space-y-5">
          {data.patients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><User className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold text-foreground">Patients ({data.patients.length})</h2></div>
              <div className="space-y-2">
                {data.patients.map((p: any) => (
                  <Link key={p.id} href={`/patients/${p.id}`}>
                    <Card className="card-hover cursor-pointer"><CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">{(p.fullName ?? "?")[0]}</div>
                          <div><p className="font-medium text-sm">{p.fullName}</p><p className="text-xs text-muted-foreground">{p.patientId} · {p.phone}</p></div>
                        </div>
                        <div className="flex items-center gap-2"><Badge className="text-xs bg-muted text-muted-foreground border-0">{p.status}</Badge><ArrowRight className="w-4 h-4 text-muted-foreground" /></div>
                      </div>
                    </CardContent></Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {data.visits.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Stethoscope className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold text-foreground">Visits ({data.visits.length})</h2></div>
              <div className="space-y-2">
                {data.visits.map((v: any) => (
                  <Link key={v.id} href={`/visits/${v.id}`}>
                    <Card className="card-hover cursor-pointer"><CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium text-sm">{v.diagnosisText || v.chiefComplaint || "Visit"}</p><p className="text-xs text-muted-foreground">{v.patientName && `${v.patientName} · `}{v.visitDate ? format(new Date(v.visitDate), "MMM d, yyyy") : ""}</p></div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent></Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {data.prescriptions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><Pill className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold text-foreground">Prescriptions ({data.prescriptions.length})</h2></div>
              <div className="space-y-2">
                {data.prescriptions.map((rx: any) => (
                  <Card key={rx.id} className="card-hover"><CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div><p className="font-medium text-sm">Prescription #{rx.id}</p><p className="text-xs text-muted-foreground">{rx.patientName && `${rx.patientName} · `}{rx.createdAt ? format(new Date(rx.createdAt), "MMM d, yyyy") : ""}</p></div>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!debouncedQuery && <div className="text-center py-16 text-muted-foreground"><SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">Start typing to search</p><p className="text-sm mt-1">Search by patient name, ID, phone, diagnosis, or medicine</p></div>}
    </div>
  );
}
