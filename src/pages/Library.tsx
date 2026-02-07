import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Search, FileText, BookOpen, Layout as LayoutIcon, FileSpreadsheet, Download, ExternalLink } from 'lucide-react';

interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_url: string | null;
  created_at: string;
}

const CATEGORY_INFO: Record<string, { label: string; icon: any; color: string }> = {
  report: { label: '보고서', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  template: { label: '템플릿', icon: FileSpreadsheet, color: 'bg-green-100 text-green-700' },
  guide: { label: '가이드', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
  sample: { label: '샘플', icon: LayoutIcon, color: 'bg-orange-100 text-orange-700' },
};

export default function Library() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('library')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Library fetch error:', error);
      // Demo data fallback
      setItems([
        { id: 'l1', title: '2024 산업분석 가이드', description: '산업 분석 보고서를 작성하기 위한 완벽한 가이드라인입니다. 시장 규모, 경쟁사 분석, 트렌드 파악 방법을 안내합니다.', category: 'guide', content_url: null, created_at: '2024-01-15T10:00:00Z' },
        { id: 'l2', title: '기업분석 템플릿', description: '표준화된 기업 분석 템플릿으로, 재무제표, SWOT 분석, 경쟁력 평가 항목이 포함되어 있습니다.', category: 'template', content_url: null, created_at: '2024-01-10T10:00:00Z' },
        { id: 'l3', title: '반도체 산업 분석 (샘플)', description: '글로벌 반도체 시장의 동향과 주요 기업 분석을 담은 샘플 보고서입니다.', category: 'sample', content_url: null, created_at: '2024-01-05T10:00:00Z' },
        { id: 'l4', title: '2023 상반기 IT 트렌드 리포트', description: 'AI, 클라우드, 메타버스 등 주요 IT 기술 트렌드를 분석한 보고서입니다.', category: 'report', content_url: null, created_at: '2024-01-01T10:00:00Z' },
        { id: 'l5', title: '스타트업 투자 분석 템플릿', description: '스타트업의 성장 가능성과 투자 가치를 평가하기 위한 분석 템플릿입니다.', category: 'template', content_url: null, created_at: '2023-12-20T10:00:00Z' },
        { id: 'l6', title: '시장조사 방법론 가이드', description: '효과적인 시장 조사를 위한 정성/정량 분석 방법론을 소개합니다.', category: 'guide', content_url: null, created_at: '2023-12-15T10:00:00Z' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCategoryCount = (category: string) => {
    if (category === 'all') return items.length;
    return items.filter(item => item.category === category).length;
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">자료실</h1>
          <p className="text-muted-foreground">
            산업 분석, 기업 분석에 도움이 되는 가이드, 템플릿, 샘플 보고서를 제공합니다.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="자료 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              전체 <Badge variant="secondary" className="ml-2">{getCategoryCount('all')}</Badge>
            </TabsTrigger>
            <TabsTrigger value="guide">
              가이드 <Badge variant="secondary" className="ml-2">{getCategoryCount('guide')}</Badge>
            </TabsTrigger>
            <TabsTrigger value="template">
              템플릿 <Badge variant="secondary" className="ml-2">{getCategoryCount('template')}</Badge>
            </TabsTrigger>
            <TabsTrigger value="report">
              보고서 <Badge variant="secondary" className="ml-2">{getCategoryCount('report')}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sample">
              샘플 <Badge variant="secondary" className="ml-2">{getCategoryCount('sample')}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Items Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">자료가 없습니다</h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery ? '검색어를 변경해 보세요.' : '아직 등록된 자료가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const categoryInfo = CATEGORY_INFO[item.category] || CATEGORY_INFO.report;
              const CategoryIcon = categoryInfo.icon;
              
              return (
                <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow">
                  <CardHeader className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {categoryInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="mt-3 line-clamp-3">
                      {item.description || '설명이 없습니다.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </span>
                      {item.content_url ? (
                        <Button size="sm" asChild>
                          <a href={item.content_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            다운로드
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          준비중
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
