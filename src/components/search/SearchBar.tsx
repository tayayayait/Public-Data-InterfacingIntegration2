import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
  size?: 'default' | 'lg';
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({ 
  className, 
  size = 'default',
  placeholder = '검색어를 입력하세요 (예: 2024 반도체 시장 동향)',
  onSearch
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        // 검색 진행 페이지로 이동 (로딩 후 overview 또는 no-results로 리다이렉트)
        navigate(`/search/progress?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <form 
      onSubmit={handleSearch} 
      className={cn(
        'relative flex items-center gap-2',
        className
      )}
    >
      <div className="relative flex-1">
        <Search className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground',
          size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
        )} />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'pl-12 pr-4 shadow-soft border-muted',
            size === 'lg' ? 'h-14 text-lg rounded-xl' : 'h-10 rounded-lg'
          )}
        />
      </div>
      <Button 
        type="submit" 
        className={cn(
          'gradient-primary shrink-0',
          size === 'lg' ? 'h-14 px-8 rounded-xl text-base' : 'h-10 px-4 rounded-lg'
        )}
      >
        <Sparkles className={cn(
          'mr-2',
          size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
        )} />
        AI 분석
      </Button>
    </form>
  );
}
