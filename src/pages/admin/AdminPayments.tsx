import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string | null;
  product_name: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  paid: '완료',
  failed: '실패',
  refunded: '환불',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchPayments();
  }, [currentPage, statusFilter]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select('*, profiles(email, full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      const formattedPayments: Payment[] = (data || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        amount: p.amount,
        status: p.status,
        payment_method: p.payment_method,
        product_name: p.product_name,
        created_at: p.created_at,
        user_email: p.profiles?.email,
        user_name: p.profiles?.full_name,
      }));

      setPayments(formattedPayments);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));

      // Calculate total
      const { data: sumData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'paid');
      
      const sum = sumData?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;
      setTotalAmount(sum);
    } catch (error) {
      console.error('Payments fetch error:', error);
      // Demo data fallback
      setPayments([
        { id: 'p1', user_id: 'u1', amount: 59000, status: 'paid', payment_method: '카드', product_name: '프로 보고서', created_at: '2024-01-20T10:00:00Z', user_email: 'user1@example.com', user_name: '김철수' },
        { id: 'p2', user_id: 'u2', amount: 39000, status: 'paid', payment_method: '카드', product_name: '베이직 보고서', created_at: '2024-01-19T14:00:00Z', user_email: 'user2@example.com', user_name: '이영희' },
        { id: 'p3', user_id: 'u3', amount: 99000, status: 'pending', payment_method: null, product_name: '프리미엄 보고서', created_at: '2024-01-18T09:00:00Z', user_email: 'user3@example.com', user_name: '박민수' },
      ]);
      setTotalPages(1);
      setTotalAmount(98000);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.user_email?.toLowerCase().includes(query) ||
      payment.user_name?.toLowerCase().includes(query) ||
      payment.product_name?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleExportCSV = () => {
    const headers = ['결제일시', '고객명', '이메일', '상품명', '금액', '상태'];
    const rows = filteredPayments.map(p => [
      formatDate(p.created_at),
      p.user_name || '-',
      p.user_email || '-',
      p.product_name || '-',
      p.amount,
      STATUS_LABELS[p.status] || p.status,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">결제 내역</h1>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          CSV 내보내기
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">총 결제 금액 (완료 기준)</p>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(totalAmount)}</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일 또는 상품명으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="paid">완료</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
                <SelectItem value="refunded">환불</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>결제일시</TableHead>
                <TableHead>고객</TableHead>
                <TableHead>상품</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    결제 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payment.created_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.user_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{payment.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{payment.product_name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[payment.status] || ''} variant="secondary">
                        {STATUS_LABELS[payment.status] || payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          {filteredPayments.length}건
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
