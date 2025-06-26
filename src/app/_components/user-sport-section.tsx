"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  type Sport,
  getAllSupportedSportsAPI,
  getUserSportSubscriptionAPI,
  addSportAPI,
  deleteSportAPI,
} from "@/api/sports";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn, getActiveStyles } from "@/lib/utils";
import { PlusCircleIcon, X } from "lucide-react";
import { FaBaseballBall, FaBasketballBall, FaFootballBall } from "react-icons/fa";
import { PiSoccerBall, PiTennisBall } from "react-icons/pi";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader as DialogHeaderPrimitive,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/* 🟢  Sonner toast API */
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */
function getMatchingSportsIcon(sport: Sport) {
  switch (sport) {
    case "baseball":
      return FaBaseballBall;
    case "basketball":
      return FaBasketballBall;
    case "football":
      return FaFootballBall;
    case "soccer":
      return PiSoccerBall;
    case "tennis":
      return PiTennisBall;
    default:
      throw new Error(`No icon found for sport: ${sport}`);
  }
}

/**
 * Capitalize the first letter of the sport name for display purposes.
 */
function formatSportName(sport: Sport) {
  return sport.charAt(0).toUpperCase() + sport.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Add-sport card                                                             */
/* -------------------------------------------------------------------------- */
interface AddSportCardProps {
  availableSports: Sport[];
  onAdd: (sport: Sport) => void;
  isMutating: boolean;
}

const AddSportCard = ({
  availableSports,
  onAdd,
  isMutating,
}: AddSportCardProps) => {
  const [open, setOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | "">("");
  const [pendingSport, setPendingSport] = useState<Sport | null>(null);

  const beginningAdd = !!pendingSport || isMutating;

  const handleAdd = () => {
    if (selectedSport && !isMutating) {
      onAdd(selectedSport);
      setPendingSport(selectedSport);
    }
  };

  useEffect(() => {
    if (
      pendingSport &&
      !isMutating &&
      !availableSports.includes(pendingSport)
    ) {
      setOpen(false);
      setSelectedSport("");
      setPendingSport(null);
    }
  }, [availableSports, pendingSport, isMutating]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild aria-label="Add sport">
        <Card
          role="button"
          className={cn(
            getActiveStyles(false),
            "aspect-square justify-center cursor-pointer transition-all relative"
          )}
          aria-disabled={availableSports.length === 0}
          style={
            availableSports.length === 0
              ? { opacity: 0.5, pointerEvents: "none" }
              : {}
          }
        >
          <CardContent className="flex flex-col items-center gap-1 md:gap-2">
            <PlusCircleIcon className="w-12 h-12 lg:w-16 lg:h-16" />
            <Typography variant="h3" as="p" className="capitalize">
              Add Sport
            </Typography>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogHeaderPrimitive>
          <DialogTitle>Add Sport</DialogTitle>
          <DialogDescription>
            Add the sport you’re applying to here and start filling out schools’
            questionnaires with RecruitMax.
          </DialogDescription>
        </DialogHeaderPrimitive>

        <div className="flex flex-col gap-3 pt-2">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value as Sport)}
            className="border rounded p-2 focus:outline-none text-muted-foreground placeholder:text-muted-foreground bg-transparent"
          >
            {selectedSport === "" && (
              <option value="" disabled className="text-muted-foreground">
                Select a sport
              </option>
            )}
            {availableSports.map((sport) => (
              <option key={sport} value={sport} className="text-muted-foreground">
                {formatSportName(sport)}
              </option>
            ))}
          </select>

          <Button
            onClick={handleAdd}
            disabled={!selectedSport || beginningAdd}
            className="w-full"
          >
            {beginningAdd ? "Adding…" : "Add Sport"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* -------------------------------------------------------------------------- */
/* Main section                                                               */
/* -------------------------------------------------------------------------- */
const UserSportSection = () => {
  const queryClient = useQueryClient();

  const { data: allSports = [], isLoading: allLoading } = useQuery({
    queryKey: ["allSports"],
    queryFn: getAllSupportedSportsAPI,
  });
  const { data: userSports = [], isLoading: userLoading } = useQuery({
    queryKey: ["userSports"],
    queryFn: getUserSportSubscriptionAPI,
  });

  /* -------- add sport mutation (with sonner) -------- */
  const addSportMutation = useMutation({
    mutationFn: addSportAPI,
    onSuccess: (_data, sport) => {
      queryClient.invalidateQueries({ queryKey: ["userSports"] });
      toast.success(`${formatSportName(sport)} was successfully added.`);
    },
    onError: () => toast.error("Could not add sport — please try again."),
  });

  /* ------- delete sport mutation (with sonner) ------- */
  const deleteSportMutation = useMutation({
    mutationFn: deleteSportAPI,
    onSuccess: (_data, sport) => {
      queryClient.invalidateQueries({ queryKey: ["userSports"] });
      toast.success(`${formatSportName(sport)} was successfully deleted.`);
    },
    onError: () => toast.error("Could not delete sport — please try again."),
  });

  const [sportToDelete, setSportToDelete] = useState<Sport | null>(null);
  const [deletingPending, setDeletingPending] = useState(false);

  const availableSports = allSports.filter(
    (sport: Sport) => !userSports.includes(sport)
  );

  useEffect(() => {
    if (
      sportToDelete &&
      deletingPending &&
      !deleteSportMutation.isPending &&
      !userSports.includes(sportToDelete)
    ) {
      setSportToDelete(null);
      setDeletingPending(false);
    }
  }, [
    userSports,
    sportToDelete,
    deleteSportMutation.isPending,
    deletingPending,
  ]);

  if (allLoading || userLoading) return <div>Loading…</div>;

  const handleDelete = (sport: Sport) => {
    setDeletingPending(true);
    deleteSportMutation.mutate(sport);
  };

  const isDeleting = deletingPending;

  return (
    <>
      <Card className="gap-1">
        <CardHeader>
          <Typography variant="h2">Sport Selected:</Typography>
        </CardHeader>

        <CardContent className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 w-full">
          {userSports.map((sport) => {
            const Icon = getMatchingSportsIcon(sport);
            return (
              <Card
                key={sport}
                className={cn(
                  getActiveStyles(false),
                  "relative aspect-square flex flex-col items-center justify-center transition-all"
                )}
              >
                <button
                  type="button"
                  onClick={() => setSportToDelete(sport)}
                  className="absolute top-1 right-1 w-6 h-6 p-1 flex items-center justify-center border border-muted-foreground/20 rounded-md bg-background hover:bg-muted-foreground/10 focus:outline-none"
                  aria-label={`Remove ${sport}`}
                  disabled={isDeleting}
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>

                <CardContent className="flex flex-col items-center gap-1 md:gap-2">
                  <Icon className="w-12 h-12 lg:w-16 lg:h-16" />
                  <Typography variant="h3" as="p" className="capitalize">
                    {formatSportName(sport)}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}

          <AddSportCard
            availableSports={availableSports}
            onAdd={(sport) => addSportMutation.mutate(sport)}
            isMutating={addSportMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Delete-confirmation dialog */}
      <Dialog
        open={sportToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSportToDelete(null);
            setDeletingPending(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] p-6">
          <DialogHeaderPrimitive>
            <DialogTitle>
              {sportToDelete
                ? `Confirm ${formatSportName(sportToDelete)} Deletion`
                : "Delete Sport"}
            </DialogTitle>
            <DialogDescription>
              {sportToDelete && (
                <>
                  By deleting {formatSportName(sportToDelete)}, you will unsubscribe from all the
                  colleges you subscribed to for this sport.
                </>
              )}
            </DialogDescription>
          </DialogHeaderPrimitive>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSportToDelete(null);
                setDeletingPending(false);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => sportToDelete && handleDelete(sportToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserSportSection;
