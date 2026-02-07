import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { STATUS_LABELS, CATEGORY_LABELS, ReportStatus, ReportCategory } from '@/types';
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Search,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 목업 데이터
const mockReports: any[] = [];

const statusIcons: Record<ReportStatus, typeof CheckCircle2> = {
  draft: Clock,
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: AlertCircle,
};

const statusColors: Record<ReportStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export default function MyReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredReports = mockReports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || report.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">내 보고서</h1>
            <p className="text-muted-foreground mt-1">
              구매하고 생성한 보고서를 관리합니다
            </p>
          </div>
          <Button asChild className="gradient-primary">
            <Link to="/search">
              새 보고서 검색
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="보고서 제목으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              전체 ({mockReports.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              완료 ({mockReports.filter((r) => r.status === 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="processing">
              분석 중 ({mockReports.filter((r) => r.status === 'processing').length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              대기 중 ({mockReports.filter((r) => r.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredReports.length > 0 ? (
              <div className="space-y-4">
                {filteredReports.map((report) => {
                  const StatusIcon = statusIcons[report.status];
                  return (
                    <Card key={report.id} className="hover:shadow-card transition-shadow">
                      <CardContent className="py-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">
                                {CATEGORY_LABELS[report.category]}
                              </Badge>
                              <Badge className={statusColors[report.status]}>
                                <StatusIcon className={`mr-1 h-3 w-3 ${report.status === 'processing' ? 'animate-spin' : ''}`} />
                                {STATUS_LABELS[report.status]}
                              </Badge>
                              <Badge variant="secondary">{report.tier}</Badge>
                            </div>
                            
                            <h3 className="text-lg font-semibold">
                              <Link 
                                to={report.status === 'completed' ? `/report/${report.id}/download` : `/report/${report.id}`}
                                className="hover:text-primary transition-colors"
                              >
                                {report.title}
                              </Link>
                            </h3>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(report.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                              </span>
                              <span>•</span>
                              <span>{report.price.toLocaleString()}원</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {report.status === 'completed' ? (
                              <Button asChild size="sm" className="gradient-primary">
                                <Link to={`/report/${report.id}/download`}>
                                  <Download className="mr-2 h-4 w-4" />
                                  다운로드
                                </Link>
                              </Button>
                            ) : (
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/report/${report.id}`}>
                                  상세보기
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">보고서가 없습니다</h3>
                  <p className="mt-2 text-muted-foreground">
                    새로운 보고서를 검색하고 구매해 보세요
                  </p>
                  <Button asChild className="mt-4 gradient-primary">
                    <Link to="/search">보고서 검색하기</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
