"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import api from "@/lib/api";
import { compressImage } from "@/lib/compress-image";
import type { SiteImageItem } from "@/lib/site-images";

const SECTION_ORDER = ["hero", "bento", "smart", "team"];
const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Frames",
  bento: "Bento Cards",
  smart: "Smart Features",
  team: "Meet the Team",
};

export default function SiteImagesPage() {
  const [images, setImages] = useState<SiteImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [preview, setPreview] = useState<SiteImageItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteImageItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ images: SiteImageItem[] }>("/admin/site-images");
      setImages(res.data.images ?? []);
    } catch (e) {
      console.error("Failed to load site images", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const grouped = useMemo(() => {
    const map = new Map<string, SiteImageItem[]>();
    for (const img of images) {
      if (!map.has(img.section)) map.set(img.section, []);
      map.get(img.section)!.push(img);
    }
    return SECTION_ORDER.filter((s) => map.has(s)).map((s) => ({
      section: s,
      label: SECTION_LABELS[s] ?? s,
      items: map.get(s)!,
    }));
  }, [images]);

  const customCount = images.filter((i) => i.isCustom).length;

  const handlePick = (slug: string) => {
    setActiveSlug(slug);
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeSlug) return;
    setBusySlug(activeSlug);
    try {
      const compressed = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.82 });
      const form = new FormData();
      form.append("image", compressed);
      const res = await api.put<{ image: SiteImageItem }>(`/admin/site-images/${activeSlug}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages((prev) => prev.map((i) => (i.slug === activeSlug ? res.data.image : i)));
    } catch (err) {
      console.error("Replace failed", err);
    } finally {
      setBusySlug(null);
      setActiveSlug(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete<{ image: SiteImageItem }>(`/admin/site-images/${deleteTarget.slug}`);
      setImages((prev) => prev.map((i) => (i.slug === deleteTarget.slug ? res.data.image : i)));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Site Images</h1>
          <p className="text-sm text-muted-foreground">
            {images.length} slots · {customCount} on Cloudflare R2 · {images.length - customCount} using local fallback
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8 pb-16">
          {grouped.map((group) => (
            <div key={group.section}>
              <h2 className="mb-3 text-sm font-semibold">
                {group.label} <span className="font-normal text-muted-foreground">({group.items.length})</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map((img) => {
                  const busy = busySlug === img.slug;
                  return (
                    <div key={img.slug} className="overflow-hidden rounded-lg border bg-card">
                      <div className="relative aspect-[4/3] bg-secondary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt ?? img.title} className="h-full w-full object-cover" loading="lazy" />
                        <span
                          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            img.isCustom ? "bg-emerald-500/90 text-white" : "bg-black/60 text-white"
                          }`}
                        >
                          {img.isCustom ? "R2" : "Local"}
                        </span>
                        {busy && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-xs font-medium">{img.title}</p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{img.slug}</p>
                        <div className="mt-2 flex gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 flex-1 px-2 text-[11px]" onClick={() => setPreview(img)}>
                            <Eye className="mr-1 h-3 w-3" /> View
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 flex-1 px-2 text-[11px]" onClick={() => handlePick(img.slug)} disabled={busy}>
                            <Upload className="mr-1 h-3 w-3" /> {img.isCustom ? "Replace" : "Upload"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(img)}
                            disabled={busy || !img.isCustom}
                            title={img.isCustom ? "Hard-delete from R2 and revert to local" : "Already using local fallback"}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)}>
        <DialogContent onClose={() => setPreview(null)}>
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription className="font-mono text-[11px]">{preview?.slug}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="overflow-hidden rounded-md bg-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.alt ?? preview.title} className="max-h-[60vh] w-full object-contain" />
            </div>
          )}
          <p className="break-all font-mono text-[10px] text-muted-foreground">{preview?.url}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogContent onClose={() => !deleting && setDeleteTarget(null)}>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.slug}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the file from Cloudflare R2 and reverts this slot to its local fallback
              ({deleteTarget?.fallback}). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete from R2"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
