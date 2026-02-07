import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string | null;
}

interface UserDetail extends User {
  payments: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
  }[];
  reportsCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  free_member: '무료회원',
  paid_member: '유료회원',
  admin: '관리자',
};

const ROLE_COLORS: Record<string, string> = {
  free_member: 'bg-gray-100 text-gray-800',
  paid_member: 'bg-blue-100 text-blue-800',
  admin: 'bg-purple-100 text-purple-800',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) {
      console.error('Users fetch error:', error);
      // Demo data fallback
      setUsers([
        { id: '1', email: 'user1@example.com', full_name: '김철수', role: 'paid_member', created_at: '2024-01-15T10:00:00Z', updated_at: null },
        { id: '2', email: 'user2@example.com', full_name: '이영희', role: 'free_member', created_at: '2024-01-10T10:00:00Z', updated_at: null },
        { id: '3', email: 'admin@example.com', full_name: '관리자', role: 'admin', created_at: '2024-01-01T10:00:00Z', updated_at: null },
      ]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDetail = async (userId: string) => {
    try {
      // 사용자 정보
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // 결제 내역
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // 보고서 수
      const { count: reportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setSelectedUser({
        ...userData,
        payments: paymentsData || [],
        reportsCount: reportsCount || 0,
      });
      setShowDetailModal(true);
    } catch (error) {
      console.error('User detail fetch error:', error);
      // Demo fallback
      const user = users.find(u => u.id === userId);
      if (user) {
        setSelectedUser({
          ...user,
          payments: [
            { id: 'p1', amount: 59000, status: 'paid', created_at: '2024-01-20T10:00:00Z' },
          ],
          reportsCount: 3,
        });
        setShowDetailModal(true);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">회원 관리</h1>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 이메일로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="등급 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="free_member">무료회원</SelectItem>
                <SelectItem value="paid_member">유료회원</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>등급</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead className="text-right">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[user.role] || ''} variant="secondary">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fetchUserDetail(user.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
          총 {filteredUsers.length}명
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

      {/* User Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>회원 상세 정보</DialogTitle>
            <DialogDescription>
              선택한 회원의 프로필과 결제 내역입니다.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Profile */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">프로필</h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">이름</span>
                    <span className="text-sm font-medium">{selectedUser.full_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">이메일</span>
                    <span className="text-sm font-medium">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">등급</span>
                    <Badge className={ROLE_COLORS[selectedUser.role] || ''} variant="secondary">
                      {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">보고서 수</span>
                    <span className="text-sm font-medium">{selectedUser.reportsCount}건</span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">최근 결제 내역</h4>
                {selectedUser.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {selectedUser.payments.map((payment) => (
                      <div key={payment.id} className="flex justify-between p-3">
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</p>
                        </div>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status === 'paid' ? '완료' : payment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
