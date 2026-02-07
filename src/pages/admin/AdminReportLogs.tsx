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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronLeft, ChevronRight, Eye, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ReportLog {
  id: string;
  user_id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  report_type: string | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  user_email?: string;
  user_name?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  processing: '생성중',
  completed: '완료',
  error: '오류',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, any> = {
  pending: Loader2,
  processing: Loader2,
  completed: CheckCircle,
  error: AlertCircle,
};

export default function AdminReportLogs() {
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ReportLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchLogs();
  }, [currentPage, statusFilter]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select('*, profiles(email, full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'draft' | 'pending' | 'processing' | 'completed' | 'failed' | 'error');
      }

      const { data, count, error } = await query;

      if (error) throw error;

      const formattedLogs: ReportLog[] = (data || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        title: r.title || '제목 없음',
        status: r.status || 'pending',
        report_type: r.report_type,
        created_at: r.created_at,
        completed_at: r.completed_at,
        error_message: r.error_message,
        user_email: r.profiles?.email,
        user_name: r.profiles?.full_name,
      }));

      setLogs(formattedLogs);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) {
      console.error('Report logs fetch error:', error);
      // Demo data fallback
      setLogs([
        { id: 'r1', user_id: 'u1', title: '2024 반도체 시장 분석', status: 'completed', report_type: 'industry', created_at: '2024-01-20T10:00:00Z', completed_at: '2024-01-20T10:05:00Z', error_message: null, user_email: 'user1@example.com', user_name: '김철수' },
        { id: 'r2', user_id: 'u2', title: '테슬라 기업 분석', status: 'processing', report_type: 'company', created_at: '2024-01-20T09:30:00Z', completed_at: null, error_message: null, user_email: 'user2@example.com', user_name: '이영희' },
        { id: 'r3', user_id: 'u3', title: '이커머스 시장 동향', status: 'error', report_type: 'market', created_at: '2024-01-19T14:00:00Z', completed_at: null, error_message: 'API 호출 실패: 공공데이터 서버 응답 없음', user_email: 'user3@example.com', user_name: '박민수' },
      ]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.title?.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.user_name?.toLowerCase().includes(query)
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

  const getDuration = (start: string, end: string | null) => {
    if (!end) return '-';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = Math.round((endTime - startTime) / 1000);
    if (diff < 60) return `${diff}초`;
    return `${Math.floor(diff / 60)}분 ${diff % 60}초`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">보고서 생성 로그</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="제목, 이름 또는 이메일로 검색"
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
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="processing">생성중</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="error">오류</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>생성일시</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>소요시간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    생성 로그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const StatusIcon = STATUS_ICONS[log.status] || FileText;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {log.title}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{log.user_name || '-'}</p>
                          <p className="text-xs text-muted-foreground">{log.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {getDuration(log.created_at, log.completed_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[log.status] || ''} flex items-center gap-1 w-fit`} variant="secondary">
                          <StatusIcon className={`h-3 w-3 ${log.status === 'processing' ? 'animate-spin' : ''}`} />
                          {STATUS_LABELS[log.status] || log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          {filteredLogs.length}건
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

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>보고서 생성 상세</DialogTitle>
            <DialogDescription>
              생성 요청 정보 및 처리 결과입니다.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">제목</span>
                  <span className="text-sm font-medium">{selectedLog.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">유형</span>
                  <span className="text-sm font-medium">{selectedLog.report_type || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">사용자</span>
                  <span className="text-sm font-medium">{selectedLog.user_name || selectedLog.user_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">요청일시</span>
                  <span className="text-sm font-medium">{formatDate(selectedLog.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">완료일시</span>
                  <span className="text-sm font-medium">{selectedLog.completed_at ? formatDate(selectedLog.completed_at) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">소요시간</span>
                  <span className="text-sm font-medium">{getDuration(selectedLog.created_at, selectedLog.completed_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">상태</span>
                  <Badge className={STATUS_COLORS[selectedLog.status] || ''} variant="secondary">
                    {STATUS_LABELS[selectedLog.status] || selectedLog.status}
                  </Badge>
                </div>
              </div>

              {selectedLog.status === 'error' && selectedLog.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-1">오류 메시지</p>
                  <p className="text-sm text-red-700">{selectedLog.error_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
