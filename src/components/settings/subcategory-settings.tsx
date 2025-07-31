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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SubCategory } from "@/lib/types";

const subCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  parentCategory: z.string().min(1, "Parent category is required"),
});

const SubCategoryForm = ({ subCategory, onSave, close }: { subCategory?: SubCategory, onSave: (data: z.infer<typeof subCategorySchema>) => void, close: () => void }) => {
  const { settings } = useApp();
  const { register, handleSubmit, control, formState: { errors } } = useForm<z.infer<typeof subCategorySchema>>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: subCategory || { name: "", parentCategory: "" },
  });

  return (
    <form onSubmit={handleSubmit(data => { onSave(data); close(); })}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Sub-Category Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="parentCategory">Parent Category</Label>
          <Select onValueChange={(value) => register("parentCategory").onChange({ target: { value } })} defaultValue={subCategory?.parentCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a parent category" />
            </SelectTrigger>
            <SelectContent>
              {settings.workflowCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.parentCategory && <p className="text-sm text-destructive">{errors.parentCategory.message}</p>}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
}

export default function SubcategorySettings() {
  const { settings, addSubCategory, updateSubCategory, deleteSubCategory } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | undefined>(undefined);

  const handleSave = (data: z.infer<typeof subCategorySchema>) => {
    if (editingSubCategory) {
      updateSubCategory({ ...editingSubCategory, ...data });
    } else {
      addSubCategory(data);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sub-Categories</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingSubCategory(undefined)}}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSubCategory(undefined)}>Add New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubCategory ? "Edit" : "Add"} Sub-Category</DialogTitle>
            </DialogHeader>
            <SubCategoryForm subCategory={editingSubCategory} onSave={handleSave} close={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Parent Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.subCategories.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>{sub.name}</TableCell>
                <TableCell>{sub.parentCategory}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingSubCategory(sub); setIsDialogOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This will delete the sub-category.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSubCategory(sub.id)}>Delete</AlertDialogAction>
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
