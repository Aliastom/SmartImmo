import React, { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/animated';

interface PropertyPhotosByRoomProps {
  property: any;
}

const ROOM_LABELS: Record<string, string> = {
  bedroom: 'Chambre',
  bathroom: 'Salle de bain',
  kitchen: 'Cuisine',
  living: 'Salon',
  other: 'Autre',
};

const ROOM_ICONS: Record<string, JSX.Element> = {
  bedroom: <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="8" rx="2" /><path d="M7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" /></svg>,
  bathroom: <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 16v-1a5 5 0 0 1 10 0v1" /><rect x="5" y="16" width="14" height="5" rx="2" /></svg>,
  kitchen: <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="2" /><rect x="7" y="2" width="10" height="6" rx="2" /></svg>,
  living: <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="12" width="20" height="8" rx="2" /><rect x="6" y="4" width="12" height="8" rx="2" /></svg>,
  other: <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
}

export const PropertyPhotosByRoom: React.FC<PropertyPhotosByRoomProps> = ({ property }) => {
  const [photosByRoom, setPhotosByRoom] = useState<Record<string, string[]>>({});
  const [previewByRoom, setPreviewByRoom] = useState<Record<string, string[]>>({});
  const [captionsByRoom, setCaptionsByRoom] = useState<Record<string, string[]>>({});
  const [uploadingRoom, setUploadingRoom] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [modalRoom, setModalRoom] = useState<string | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { room: string; url: string }>(null);
  const [editingCaption, setEditingCaption] = useState<{ room: string; index: number } | null>(null);
  const [captionInput, setCaptionInput] = useState('');
  const supabase = createClientComponentClient<Database>();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!property?.id) return;
    const fetchPhotos = async () => {
      const { data, error } = await supabase
        .from('property_photos')
        .select('room_type, photo_url, caption')
        .eq('property_id', property.id);
      if (error) return;
      const grouped: Record<string, string[]> = {};
      const captions: Record<string, string[]> = {};
      data?.forEach((item) => {
        if (!grouped[item.room_type]) grouped[item.room_type] = [];
        grouped[item.room_type].push(item.photo_url);
        if (!captions[item.room_type]) captions[item.room_type] = [];
        captions[item.room_type].push(item.caption || '');
      });
      setPhotosByRoom(grouped);
      setCaptionsByRoom(captions);
    };
    fetchPhotos();
  }, [property?.id, uploading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, room: string) => {
    const file = e.target.files?.[0];
    if (!file || !property?.id) return;
    setUploadingRoom(room);
    setUploading(true);

    // 1. Générer l'aperçu base64 et l'ajouter à l'état preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewByRoom(prev => ({
        ...prev,
        [room]: [...(prev[room] || []), reader.result as string]
      }));
    };
    reader.readAsDataURL(file);

    try {
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const filePath = `${property.id}/${room}/${Date.now()}-${Math.random().toString(36).substring(2,8)}.${fileExt}`;
      // 2. Générer une URL signée pour upload
      let signedUrl = '';
      let path = '';
      let uploadError = null;
      try {
        const res = await supabase.storage.from('property-photos').createSignedUploadUrl(filePath, 60);
        if (res.error) {
          alert('Erreur création URL signée : ' + res.error.message);
          setUploadingRoom(null);
          setUploading(false);
          return;
        }
        signedUrl = res.data.signedUrl;
        path = res.data.path;
      } catch (err) {
        alert('Erreur création URL signée : ' + (err as Error).message);
        setUploadingRoom(null);
        setUploading(false);
        return;
      }
      // 3. Upload avec PUT
      let putRes;
      try {
        putRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });
        if (!putRes.ok) {
          alert('Erreur PUT : ' + (await putRes.text()));
          setUploadingRoom(null);
          setUploading(false);
          return;
        }
      } catch (err) {
        alert('Erreur PUT : ' + (err as Error).message);
        setUploadingRoom(null);
        setUploading(false);
        return;
      }
      // 4. Construire l’URL publique
      const photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${path}`;
      // 5. Récupérer l'utilisateur connecté et insérer dans la table
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Session utilisateur expirée.');
        const userId = session.user.id;
        // Insérer la photo avec user_id
        const { error: insertError } = await supabase.from('property_photos').insert({
          property_id: property.id,
          room_type: room,
          photo_url: photoUrl,
          user_id: userId,
        });
        if (insertError) throw insertError;
        setUploadingRoom(null);
        setUploading(false);
        // Rafraîchir l'affichage
        setPhotosByRoom((prev) => ({ ...prev, [room]: [...(prev[room] || []), photoUrl] }));
        setCaptionsByRoom((prev) => ({ ...prev, [room]: [...(prev[room] || []), ''] }));
        // Retirer le preview base64 correspondant (le dernier ajouté)
        setPreviewByRoom(prev => {
          const previews = prev[room] || [];
          return {
            ...prev,
            [room]: previews.slice(0, previews.length - 1)
          };
        });
        if (fileInputs.current[room]) fileInputs.current[room]!.value = '';
      } catch (err) {
        alert('[SESSION/INSERT ERROR] ' + (err as Error).message);
        setUploadingRoom(null);
        setUploading(false);
      }
    } catch (err) {
      alert('Erreur lors de l’upload : ' + (err as Error).message);
      setUploadingRoom(null);
      setUploading(false);
    }
  };

  const handleDeletePhoto = (room: string, url: string) => {
    setConfirmDelete({ room, url });
  };

  const confirmDeletePhoto = async () => {
    if (!confirmDelete || !property?.id) return;
    setDeleting(confirmDelete.url);
    try {
      const urlParts = confirmDelete.url.split('/property-photos/');
      const path = urlParts[1];
      const { error: storageError } = await supabase.storage.from('property-photos').remove([path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from('property_photos')
        .delete()
        .eq('property_id', property.id)
        .eq('room_type', confirmDelete.room)
        .eq('photo_url', confirmDelete.url);
      if (dbError) throw dbError;
      setPhotosByRoom(prev => ({
        ...prev,
        [confirmDelete.room]: (prev[confirmDelete.room] || []).filter(u => u !== confirmDelete.url)
      }));
      setCaptionsByRoom(prev => ({
        ...prev,
        [confirmDelete.room]: (prev[confirmDelete.room] || []).filter((_, i) => (prev[confirmDelete.room] || [])[i] !== confirmDelete.url)
      }));
      setConfirmDelete(null);
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    if (!isImageModalOpen || modalRoom === null || modalIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && modalIndex > 0 && photosByRoom[modalRoom]) {
        setModalIndex(idx => {
          const newIdx = (idx ?? 1) - 1;
          setModalImageUrl(photosByRoom[modalRoom][newIdx]);
          return newIdx;
        });
      } else if (e.key === 'ArrowRight' && photosByRoom[modalRoom] && modalIndex < photosByRoom[modalRoom].length - 1) {
        setModalIndex(idx => {
          const newIdx = (idx ?? 0) + 1;
          setModalImageUrl(photosByRoom[modalRoom][newIdx]);
          return newIdx;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen, modalRoom, modalIndex, photosByRoom]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 mt-2 flex items-center gap-2 justify-center">
        <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 012-2h12a2 2 0 012 2v16" /></svg>
        Photos par pièce
      </h2>
      {Object.keys(ROOM_LABELS).map((room) => (
        <div key={room} className="mb-8">
          <h3 className="text-xl font-semibold text-blue-600 mb-2 flex items-center gap-2">
            {ROOM_ICONS[room]}
            {ROOM_LABELS[room]}
          </h3>
          <div className="flex flex-wrap gap-6 items-end bg-white rounded-lg shadow p-4">
            {/* Afficher les previews base64 */}
            {(previewByRoom[room]?.length ?? 0) > 0 && previewByRoom[room].map((preview, i) => (
              <img
                key={`preview-${i}`}
                src={preview}
                alt={`Preview ${ROOM_LABELS[room]} ${i + 1}`}
                className="w-32 h-32 object-cover rounded border opacity-70"
              />
            ))}
            {/* Afficher les photos uploadées */}
            {(photosByRoom[room]?.length ?? 0) > 0 ? (
              photosByRoom[room]?.map((url, i) => (
                <div key={i} className="relative group">
                  {/* Bouton agrandir sur miniature supprimé */}
                  <img
                    src={url}
                    alt={`${ROOM_LABELS[room]} ${i + 1}`}
                    className="w-32 h-32 object-cover rounded border cursor-pointer"
                    onClick={() => {
                      setModalImageUrl(url);
                      setModalRoom(room);
                      setModalIndex(i);
                      setIsImageModalOpen(true);
                    }}
                  />
                  {/* Caption display & edit */}
                  <div className="mt-1 text-xs text-center">
                    {editingCaption && editingCaption.room === room && editingCaption.index === i ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="border rounded px-1 text-xs w-24"
                          value={captionInput}
                          onChange={e => setCaptionInput(e.target.value)}
                          autoFocus
                        />
                        <button
                          className="text-green-600 text-xs"
                          onClick={async () => {
                            // Save to Supabase
                            const { error } = await supabase
                              .from('property_photos')
                              .update({ caption: captionInput })
                              .eq('property_id', property.id)
                              .eq('room_type', room)
                              .eq('photo_url', url);
                            if (!error) {
                              setCaptionsByRoom(prev => {
                                const updated = { ...prev };
                                updated[room] = [...(updated[room] || [])];
                                updated[room][i] = captionInput;
                                return updated;
                              });
                              setEditingCaption(null);
                            } else {
                              alert('Erreur lors de la sauvegarde du titre.');
                            }
                          }}
                        >
                          Sauver
                        </button>
                        <button
                          className="text-gray-400 text-xs"
                          onClick={() => setEditingCaption(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        <span className="text-gray-400 italic text-xs">{captionsByRoom[room]?.[i] || '(Ajoutez un titre)'}</span>
                        <button
                          className="text-blue-500 text-xs ml-1"
                          title="Modifier le titre"
                          onClick={() => {
                            setEditingCaption({ room, index: i });
                            setCaptionInput(captionsByRoom[room]?.[i] || '');
                          }}
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Bouton supprimer */}
                  <button
                    className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-red-100 z-10"
                    onClick={() => handleDeletePhoto(room, url)}
                    disabled={deleting === url}
                    title="Supprimer la photo"
                  >
                    {deleting === url ? (
                      <LoadingSpinner className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                </div>
              ))
            ) : (
              <span className="text-gray-400 italic text-xs">(Aucune photo)</span>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={el => fileInputs.current[room] = el}
              onChange={e => handleFileChange(e, room)}
              disabled={uploadingRoom === room}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-2"
              disabled={uploadingRoom === room}
              onClick={() => fileInputs.current[room]?.click()}
            >
              {uploadingRoom === room ? 'Upload en cours...' : 'Ajouter une photo'}
            </Button>
          </div>
        </div>
      ))}
      {/* Modal d'agrandissement d'image avec navigation */}
      {isImageModalOpen && modalImageUrl && modalRoom !== null && modalIndex !== null && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <DialogTitle className="sr-only">Agrandissement de la photo</DialogTitle>
            <div className="relative">
              {/* Bouton fullscreen en haut à gauche de la grande image */}
              <button
                className="absolute top-2 left-2 z-30 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-blue-100 transition"
                title="Afficher en plein écran"
                onClick={() => {
                  const img = document.getElementById('modal-photo-img');
                  if (img && img.requestFullscreen) {
                    img.requestFullscreen();
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m0 8v3a2 2 0 002 2h3m8-16h3a2 2 0 012 2v3m0 8v3a2 2 0 01-2 2h-3" />
                </svg>
              </button>
              {/* Flèche gauche */}
              {modalIndex > 0 && (
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-70 rounded-full p-2 hover:bg-opacity-100 shadow"
                  onClick={() => {
                    if (photosByRoom[modalRoom]) {
                      setModalIndex(modalIndex - 1);
                      setModalImageUrl(photosByRoom[modalRoom][modalIndex - 1]);
                    }
                  }}
                  aria-label="Photo précédente"
                >
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              {/* Image */}
              <img
                id="modal-photo-img"
                src={modalImageUrl}
                alt="Agrandissement"
                className="mx-auto max-h-[70vh] max-w-full rounded shadow-lg"
              />
              {/* Caption */}
              <div className="text-center mt-2">
                {editingCaption && editingCaption.room === modalRoom && editingCaption.index === modalIndex ? (
                  <div className="flex items-center gap-1 justify-center">
                    <input
                      className="border rounded px-1 text-xs w-24"
                      value={captionInput}
                      onChange={e => setCaptionInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="text-green-600 text-xs"
                      onClick={async () => {
                        const url = photosByRoom[modalRoom][modalIndex];
                        const { error } = await supabase
                          .from('property_photos')
                          .update({ caption: captionInput })
                          .eq('property_id', property.id)
                          .eq('room_type', modalRoom)
                          .eq('photo_url', url);
                        if (!error) {
                          setCaptionsByRoom(prev => {
                            const updated = { ...prev };
                            updated[modalRoom] = [...(updated[modalRoom] || [])];
                            updated[modalRoom][modalIndex] = captionInput;
                            return updated;
                          });
                          setEditingCaption(null);
                        } else {
                          alert('Erreur lors de la sauvegarde du titre.');
                        }
                      }}
                    >
                      Sauver
                    </button>
                    <button
                      className="text-gray-400 text-xs"
                      onClick={() => setEditingCaption(null)}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 justify-center">
                    <span className="text-gray-400 italic text-xs">{captionsByRoom[modalRoom]?.[modalIndex] || '(Ajoutez un titre)'}</span>
                    <button
                      className="text-blue-500 text-xs ml-1"
                      title="Modifier le titre"
                      onClick={() => {
                        setEditingCaption({ room: modalRoom, index: modalIndex });
                        setCaptionInput(captionsByRoom[modalRoom]?.[modalIndex] || '');
                      }}
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>
              {/* Flèche droite */}
              {photosByRoom[modalRoom] && modalIndex < photosByRoom[modalRoom].length - 1 && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-70 rounded-full p-2 hover:bg-opacity-100 shadow"
                  onClick={() => {
                    if (photosByRoom[modalRoom]) {
                      setModalIndex(modalIndex + 1);
                      setModalImageUrl(photosByRoom[modalRoom][modalIndex + 1]);
                    }
                  }}
                  aria-label="Photo suivante"
                >
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
              {/* Fermeture */}
              <DialogClose className="absolute top-2 right-2 bg-white rounded-full p-1">
                <X className="h-6 w-6" />
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Modal de confirmation de suppression */}
      {confirmDelete && (
        <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer cette photo ? Cette action est irréversible.
            </DialogDescription>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting === confirmDelete.url}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirmDeletePhoto} disabled={deleting === confirmDelete.url}>
                {deleting === confirmDelete.url ? <LoadingSpinner className="w-4 h-4 mr-2" /> : null}
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
