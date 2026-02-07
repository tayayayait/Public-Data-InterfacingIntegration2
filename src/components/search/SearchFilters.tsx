import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CATEGORY_LABELS, ReportCategory, SearchFilters as Filters } from '@/types';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  className?: string;
}

export function SearchFilters({ filters, onFiltersChange, className }: SearchFiltersProps) {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: category as ReportCategory,
    });
  };

  const handlePriceChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: {
        min: value[0] * 1000,
        max: value[1] * 1000,
      },
    });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Category Filter */}
      <Select
        value={filters.category || ''}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="카테고리" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange?.start ? (
              <>
                {format(new Date(filters.dateRange.start), 'PPP', { locale: ko })}
                {filters.dateRange?.end && (
                  <> - {format(new Date(filters.dateRange.end), 'PPP', { locale: ko })}</>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">기간 선택</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{
              from: filters.dateRange?.start ? new Date(filters.dateRange.start) : undefined,
              to: filters.dateRange?.end ? new Date(filters.dateRange.end) : undefined,
            }}
            onSelect={(range) => {
              onFiltersChange({
                ...filters,
                dateRange: range?.from && range?.to ? {
                  start: range.from.toISOString(),
                  end: range.to.toISOString(),
                } : undefined,
              });
            }}
            numberOfMonths={2}
            locale={ko}
          />
        </PopoverContent>
      </Popover>

      {/* Price Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[140px]">
            <Filter className="mr-2 h-4 w-4" />
            가격대
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px]">
          <div className="space-y-4">
            <h4 className="font-medium">가격 범위</h4>
            <Slider
              defaultValue={[0, 100]}
              max={150}
              step={10}
              onValueChange={handlePriceChange}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{(filters.priceRange?.min || 0).toLocaleString()}원</span>
              <span>{(filters.priceRange?.max || 150000).toLocaleString()}원</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <Badge variant="secondary" className="gap-1">
            {activeFilterCount}개 필터 적용됨
            <button onClick={clearFilters} className="ml-1 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </>
      )}
    </div>
  );
}
