import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, FileText, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  report: '보고서',
  template: '템플릿',
  guide: '가이드',
  sample: '샘플',
};

export default function AdminLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'report',
    content_url: '',
    is_public: true,
  });

  useEffect(() => {
    fetchItems();
  }, [currentPage, categoryFilter]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('library')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setItems(data || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) {
      console.error('Library fetch error:', error);
      // Demo data fallback
      setItems([
        { id: 'l1', title: '2024 산업분석 가이드', description: '산업 분석 보고서 작성 가이드라인', category: 'guide', content_url: null, is_public: true, created_at: '2024-01-15T10:00:00Z', updated_at: null },
        { id: 'l2', title: '기업분석 템플릿', description: '표준 기업 분석 템플릿', category: 'template', content_url: null, is_public: true, created_at: '2024-01-10T10:00:00Z', updated_at: null },
        { id: 'l3', title: '샘플 보고서 - 반도체', description: '반도체 산업 분석 샘플', category: 'sample', content_url: null, is_public: false, created_at: '2024-01-05T10:00:00Z', updated_at: null },
      ]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('library')
        .insert([formData]);

      if (error) throw error;

      toast({ title: '자료가 추가되었습니다.' });
      setShowCreateModal(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error('Create error:', error);
      toast({ title: '오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from('library')
        .update(formData)
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({ title: '자료가 수정되었습니다.' });
      setShowEditModal(false);
      resetForm();
      fetchItems();
    } catch (error) {
      console.error('Edit error:', error);
      toast({ title: '오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const { error } = await supabase
        .from('library')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({ title: '자료가 삭제되었습니다.' });
      setShowDeleteDialog(false);
      setSelectedItem(null);
      fetchItems();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: '오류가 발생했습니다.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'report',
      content_url: '',
      is_public: true,
    });
    setSelectedItem(null);
  };

  const openEditModal = (item: LibraryItem) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      category: item.category,
      content_url: item.content_url || '',
      is_public: item.is_public,
    });
    setShowEditModal(true);
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const FormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">제목 *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
          placeholder="자료 제목"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
          placeholder="자료에 대한 설명"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">카테고리</Label>
          <Select 
            value={formData.category} 
            onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="report">보고서</SelectItem>
              <SelectItem value="template">템플릿</SelectItem>
              <SelectItem value="guide">가이드</SelectItem>
              <SelectItem value="sample">샘플</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="is_public">공개 여부</Label>
          <Select 
            value={formData.is_public ? 'public' : 'private'} 
            onValueChange={(v) => setFormData(f => ({ ...f, is_public: v === 'public' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">공개</SelectItem>
              <SelectItem value="private">비공개</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="content_url">파일 URL</Label>
        <Input
          id="content_url"
          value={formData.content_url}
          onChange={(e) => setFormData(f => ({ ...f, content_url: e.target.value }))}
          placeholder="https://..."
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">자료실 관리</h1>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              자료 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 자료 추가</DialogTitle>
              <DialogDescription>자료실에 새 항목을 추가합니다.</DialogDescription>
            </DialogHeader>
            <FormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>취소</Button>
              <Button onClick={handleCreate} disabled={!formData.title}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="제목 또는 설명으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="report">보고서</SelectItem>
                <SelectItem value="template">템플릿</SelectItem>
                <SelectItem value="guide">가이드</SelectItem>
                <SelectItem value="sample">샘플</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>공개</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    자료가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.is_public ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
        <p className="text-sm text-muted-foreground">{filteredItems.length}건</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자료 수정</DialogTitle>
            <DialogDescription>자료 정보를 수정합니다.</DialogDescription>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>취소</Button>
            <Button onClick={handleEdit} disabled={!formData.title}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedItem?.title}" 자료가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
