"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApp } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BidOrigin } from "@/lib/types";

const originSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const OriginForm = ({ origin, onSave, close }: { origin?: BidOrigin, onSave: (data: z.infer<typeof originSchema>) => void, close: () => void }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof originSchema>>({
    resolver: zodResolver(originSchema),
    defaultValues: origin || { name: "" },
  });

  return (
    <form onSubmit={handleSubmit(data => { onSave(data); close(); })}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Origin Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

export default function OriginSettings() {
  const { settings, addBidOrigin, updateBidOrigin, deleteBidOrigin } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState<BidOrigin | undefined>(undefined);

  const handleSave = (data: z.infer<typeof originSchema>) => {
    if (editingOrigin) {
      updateBidOrigin({ ...editingOrigin, ...data });
    } else {
      addBidOrigin(data);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Bid Origins</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingOrigin(undefined)}}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingOrigin(undefined)}>Add New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOrigin ? "Edit" : "Add"} Origin</DialogTitle>
            </DialogHeader>
            <OriginForm origin={editingOrigin} onSave={handleSave} close={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.bidOrigins.map((origin) => (
              <TableRow key={origin.id}>
                <TableCell>{origin.name}</TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingOrigin(origin); setIsDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={settings.bidOrigins.length <= 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will delete the bid origin.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteBidOrigin(origin.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
