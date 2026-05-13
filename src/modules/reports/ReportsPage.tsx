import { useState } from 'react';
import { Card, DataTable, Select, Badge, StatCard, Button, Input } from '@/components/ui';
import { useMembers, useCoaches, useProductSales, useMemberPayments, useMemberPackages, useCoachCommissions, useBookings, usePackages } from '@/hooks';
import { formatCurrency, formatDate } from '@/utils';
import { generateReport, previewPdf } from '@/utils/pdf';
import { PrintPreview } from '@/components/PrintPreview';
import { Printer } from 'lucide-react';

const tabs = ['Penjualan', 'Pembayaran', 'Detail', 'Saldo', 'Komisi', 'Profit'] as const;

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFilename, setPdfFilename] = useState('');

  const { data: members = [] } = useMembers(true);
  const { data: coaches = [] } = useCoaches();
  const { data: packages = [] } = usePackages();
  const { data: sales = [] } = useProductSales({ startDate, endDate });
  const { data: payments = [] } = useMemberPayments({ startDate, endDate });
  const { data: memberPackages = [] } = useMemberPackages(selectedMember || undefined);
  const { data: allMemberPackages = [] } = useMemberPackages();
  const { data: commissions = [] } = useCoachCommissions({ coach_id: selectedCoach || undefined, startDate, endDate });
  const { data: bookings = [] } = useBookings({ member_id: selectedMember || undefined });
  const { data: memberPayments = [] } = useMemberPayments({ member_id: selectedMember || undefined });

  const memberMap = Object.fromEntries(members.map(m => [m.member_id, m.full_name]));
  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const packageMap = Object.fromEntries(packages.map(p => [p.package_id, p.package_name]));

  const printSalesReport = () => {
    const doc = generateReport(`Laporan Penjualan (${formatDate(startDate)} - ${formatDate(endDate)})`, ['Tanggal', 'Customer', 'Items', 'Total'],
      sales.map(s => [formatDate(s.transaction_date), s.customer_name, s.items.map(i => `${i.product_name} x${i.quantity}`).join(', '), formatCurrency(s.total)]),
      [{ label: 'Total Penjualan', value: formatCurrency(sales.reduce((sum, s) => sum + s.total, 0)) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('laporan-penjualan.pdf');
  };
  const printPaymentsReport = () => {
    const doc = generateReport(`Laporan Pembayaran (${formatDate(startDate)} - ${formatDate(endDate)})`, ['Tanggal', 'Member', 'Paket', 'Jumlah', 'Metode'],
      payments.map(p => [formatDate(p.payment_date), memberMap[p.member_id] || '-', packageMap[p.package_id] || '-', formatCurrency(p.amount), p.payment_method]),
      [{ label: 'Total', value: formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0)) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('laporan-pembayaran.pdf');
  };
  const printBalanceReport = () => {
    const doc = generateReport('Laporan Saldo Member', ['Member', 'Paket', 'Sisa', 'Total', 'Status', 'Expired'],
      allMemberPackages.map(p => [memberMap[p.member_id] || '-', packageMap[p.package_id] || '-', String(p.remaining_sessions), String(p.total_sessions), p.status, formatDate(p.expired_date)]));
    setPdfUrl(previewPdf(doc)); setPdfFilename('laporan-saldo.pdf');
  };
  const printCommissionReport = () => {
    const doc = generateReport(`Laporan Komisi (${formatDate(startDate)} - ${formatDate(endDate)})`, ['Tanggal', 'Coach', 'Member', 'Harga', '%', 'Komisi'],
      commissions.map(c => [formatDate(c.date), coachMap[c.coach_id] || '-', memberMap[c.member_id] || '-', formatCurrency(c.package_price), `${c.commission_percentage}%`, formatCurrency(c.commission_amount)]),
      [{ label: 'Total Komisi', value: formatCurrency(commissions.reduce((sum, c) => sum + c.commission_amount, 0)) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('laporan-komisi.pdf');
  };
  const printProfitReport = () => {
    const tp = payments.reduce((s, r) => s + r.amount, 0), ts = sales.reduce((s, r) => s + r.total, 0), tc = commissions.reduce((s, r) => s + r.commission_amount, 0);
    const doc = generateReport(`Laporan Profit (${formatDate(startDate)} - ${formatDate(endDate)})`, ['Keterangan', 'Jumlah'],
      [['Pembayaran Member', formatCurrency(tp)], ['Penjualan Produk', formatCurrency(ts)], ['Komisi Coach', `(${formatCurrency(tc)})`]],
      [{ label: 'Total Pemasukan', value: formatCurrency(tp + ts) }, { label: 'Total Komisi', value: formatCurrency(tc) }, { label: 'NET PROFIT', value: formatCurrency((tp + ts) - tc) }]);
    setPdfUrl(previewPdf(doc)); setPdfFilename('laporan-profit.pdf');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h1 className="text-2xl font-bold">Laporan</h1>

      {/* Tab bar - native style segmented control */}
      <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
        <div className="inline-flex bg-white rounded-2xl p-1 border border-zen-ink/5 min-w-max">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-zen-brand text-white shadow-sm' : 'text-zen-ink/50'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Date filter - compact row */}
      {activeTab !== 'Detail' && activeTab !== 'Saldo' && (
        <div className="flex gap-2 items-center">
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1" />
          <span className="text-zen-ink/30 text-xs">—</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1" />
        </div>
      )}

      {/* Content */}
      {activeTab === 'Penjualan' && (
        <>
          <div className="flex justify-between items-center">
            <div className="glass-card rounded-2xl px-4 py-3 inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Total</span>
              <span className="text-lg font-bold">{formatCurrency(sales.reduce((s, r) => s + r.total, 0))}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={printSalesReport}><Printer size={16} /></Button>
          </div>
          <DataTable columns={[
            { key: 'transaction_date', label: 'Tanggal', render: (r: any) => formatDate(r.transaction_date) },
            { key: 'customer_name', label: 'Customer' },
            { key: 'total', label: 'Total', render: (r: any) => formatCurrency(r.total) },
          ]} data={sales} />
        </>
      )}

      {activeTab === 'Pembayaran' && (
        <>
          <div className="flex justify-between items-center">
            <div className="glass-card rounded-2xl px-4 py-3 inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Total</span>
              <span className="text-lg font-bold">{formatCurrency(payments.reduce((s, r) => s + r.amount, 0))}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={printPaymentsReport}><Printer size={16} /></Button>
          </div>
          <DataTable columns={[
            { key: 'payment_date', label: 'Tanggal', render: (r: any) => formatDate(r.payment_date) },
            { key: 'member_id', label: 'Member', render: (r: any) => memberMap[r.member_id] || '-' },
            { key: 'amount', label: 'Jumlah', render: (r: any) => formatCurrency(r.amount) },
          ]} data={payments} />
        </>
      )}

      {activeTab === 'Detail' && (
        <>
          <Select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
            options={[{ value: '', label: '— Pilih Member —' }, ...members.map(m => ({ value: m.member_id, label: m.full_name }))]} />
          {selectedMember && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <StatCard title="Booking" value={bookings.length} />
                <StatCard title="Hadir" value={bookings.filter(b => b.booking_status === 'attended').length} />
                <StatCard title="Paket Aktif" value={memberPackages.filter(p => p.status === 'active').length} />
                <StatCard title="Total Bayar" value={formatCurrency(memberPayments.reduce((s, p) => s + p.amount, 0))} />
              </div>
              <Card title="Paket">
                <div className="space-y-2">
                  {memberPackages.map(p => (
                    <div key={p.member_package_id} className="flex justify-between items-center py-2 border-b border-zen-brand/5 last:border-0">
                      <div>
                        <div className="text-sm font-medium">{packageMap[p.package_id] || '-'}</div>
                        <div className="text-[10px] text-zen-ink/40">Exp: {formatDate(p.expired_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{p.remaining_sessions}/{p.total_sessions}</div>
                        <Badge variant={p.status === 'active' ? 'success' : 'danger'}>{p.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {activeTab === 'Saldo' && (
        <>
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={printBalanceReport}><Printer size={16} /></Button>
          </div>
          <div className="space-y-3">
            {allMemberPackages.map(p => (
              <div key={p.member_package_id} className="glass-card rounded-2xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm">{memberMap[p.member_id] || '-'}</div>
                    <div className="text-[10px] text-zen-ink/40 mt-0.5">{packageMap[p.package_id] || '-'}</div>
                  </div>
                  <Badge variant={p.status === 'active' ? 'success' : p.status === 'expired' ? 'danger' : 'warning'}>{p.status}</Badge>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-zen-brand/5">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Sisa Sesi</span>
                  <span className="text-lg font-bold">{p.remaining_sessions}<span className="text-zen-ink/30 text-sm">/{p.total_sessions}</span></span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Expired</span>
                  <span className="text-xs text-zen-ink/60">{formatDate(p.expired_date)}</span>
                </div>
              </div>
            ))}
            {allMemberPackages.length === 0 && <p className="text-center text-zen-ink/30 py-8 text-sm">Tidak ada data</p>}
          </div>
        </>
      )}

      {activeTab === 'Komisi' && (
        <>
          <Select value={selectedCoach} onChange={e => setSelectedCoach(e.target.value)}
            options={[{ value: '', label: '— Semua Coach —' }, ...coaches.map(c => ({ value: c.coach_id, label: c.full_name }))]} />
          <div className="flex justify-between items-center">
            <div className="glass-card rounded-2xl px-4 py-3 inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Total</span>
              <span className="text-lg font-bold">{formatCurrency(commissions.reduce((s, r) => s + r.commission_amount, 0))}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={printCommissionReport}><Printer size={16} /></Button>
          </div>
          <DataTable columns={[
            { key: 'date', label: 'Tanggal', render: (r: any) => formatDate(r.date) },
            { key: 'coach_id', label: 'Coach', render: (r: any) => coachMap[r.coach_id] || '-' },
            { key: 'commission_amount', label: 'Komisi', render: (r: any) => formatCurrency(r.commission_amount) },
          ]} data={commissions} />
        </>
      )}

      {activeTab === 'Profit' && (() => {
        const tp = payments.reduce((s, r) => s + r.amount, 0);
        const ts = sales.reduce((s, r) => s + r.total, 0);
        const tc = commissions.reduce((s, r) => s + r.commission_amount, 0);
        const net = (tp + ts) - tc;
        return (
          <>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={printProfitReport}><Printer size={16} /></Button>
            </div>
            <div className="space-y-3">
              <div className="glass-card rounded-2xl p-5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Net Profit</div>
                <div className="text-3xl font-bold tracking-tight">{formatCurrency(net)}</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card rounded-2xl p-4 text-center">
                  <div className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Member</div>
                  <div className="text-sm font-bold">{formatCurrency(tp)}</div>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center">
                  <div className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Produk</div>
                  <div className="text-sm font-bold">{formatCurrency(ts)}</div>
                </div>
                <div className="glass-card rounded-2xl p-4 text-center">
                  <div className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Komisi</div>
                  <div className="text-sm font-bold text-red-500">-{formatCurrency(tc)}</div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <PrintPreview open={!!pdfUrl} onClose={() => setPdfUrl('')} pdfUrl={pdfUrl} filename={pdfFilename} />
    </div>
  );
}
