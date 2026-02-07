import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, SearchResult, ReportCategory } from '@/types';
import { ArrowRight, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ReportCardProps {
  report: SearchResult;
  className?: string;
}

const categoryColors: Record<ReportCategory, string> = {
  industry: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  company: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  technology: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  market: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  custom: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export function ReportCard({ report, className }: ReportCardProps) {
  return (
    <Card className={cn('group hover:shadow-hover transition-all duration-300', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <Badge className={cn('shrink-0', categoryColors[report.category])}>
            {CATEGORY_LABELS[report.category]}
          </Badge>
          <span className="text-lg font-bold text-primary">
            {report.price.toLocaleString()}원
          </span>
        </div>
        <Link to={`/report/${report.id}`}>
          <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {report.title}
          </h3>
        </Link>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {report.description}
        </p>
        {report.keywords && report.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {report.keywords.slice(0, 3).map((keyword) => (
              <Badge key={keyword} variant="outline" className="text-xs">
                <Tag className="mr-1 h-2.5 w-2.5" />
                {keyword}
              </Badge>
            ))}
            {report.keywords.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{report.keywords.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center text-xs text-muted-foreground">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {format(new Date(report.created_at), 'yyyy.MM.dd', { locale: ko })}
        </div>
        <Button asChild variant="ghost" size="sm" className="group/btn">
          <Link to={`/report/${report.id}`}>
            상세보기
            <ArrowRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
