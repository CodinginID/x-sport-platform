import { useState } from 'react';
import { useStudioStore } from '@/stores/studio';
import { Card, Button, Input } from '@/components/ui';
import { Building2, MapPin, PackageOpen } from 'lucide-react';

export function StudioSection() {
  const { name, address, lowStockThreshold, setName, setAddress, setLowStockThreshold } = useStudioStore();
  const [editName, setEditName] = useState(name);
  const [editAddress, setEditAddress] = useState(address);
  const [editThreshold, setEditThreshold] = useState(lowStockThreshold);
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    setName(editName);
    setAddress(editAddress);
    setLowStockThreshold(editThreshold);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(name);
    setEditAddress(address);
    setEditThreshold(lowStockThreshold);
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card title="Studio">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-zen-brand shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Nama Studio</div>
              <div className="font-bold text-sm">{name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-zen-brand shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Alamat</div>
              <div className="text-sm">{address}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PackageOpen size={18} className="text-zen-brand shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Batas Stok Rendah</div>
              <div className="font-bold text-sm">{lowStockThreshold}</div>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)} className="mt-2">Edit</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Edit Studio">
      <div className="space-y-4">
        <Input label="Nama Studio" value={editName} onChange={e => setEditName(e.target.value)} />
        <Input label="Alamat" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
        <Input label="Batas Stok Rendah" type="number" min={1} value={editThreshold} onChange={e => setEditThreshold(+e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">Simpan</Button>
          <Button variant="secondary" onClick={handleCancel}>Batal</Button>
        </div>
      </div>
    </Card>
  );
}
