import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarDays, Home, Info, Settings, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { z } from "zod";

import { ByIdSkeleton } from "~/components/shared/ByIdSkeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { CustomInput } from "~/components/shared/CustomInput";
import { CustomSelect } from "~/components/shared/CustomSelect";
import { DataTable } from "~/components/shared/DataTable";
import { DateInputField } from "~/components/shared/DateInputField";
import { EmptyState } from "~/components/shared/EmptyState";
import { FilterSheet } from "~/components/shared/FilterSheet";
import { InfoItem } from "~/components/shared/InfoItem";
import { Modal } from "~/components/shared/Modal";
import { UniversalImage } from "~/components/shared/UniversalImage";
import { UserAvatar } from "~/components/shared/UserAvatar";
import { ModeToggle } from "~/components/layout/ModeToggle";
import { Panel } from "~/components/layout/Panel";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import BreadCrumbs from "~/components/ui/bread-crumb";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "~/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { FormCustomSelect } from "~/components/ui/form/FormCustomSelect";
import { FormInput } from "~/components/ui/form/FormInput";
import { FormTextarea } from "~/components/ui/form/FormTextarea";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Label } from "~/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { useDataTable } from "~/hooks/useDataTable";
import { useForm } from "~/hooks/useForm";
import type { ActiveFilter, FilterConfig } from "~/types/filters";

// ─── Sample data ────────────────────────────────────────────────────────────

interface EmployeeRow {
  id: string;
  name: string;
  role: string;
  status: "active" | "inactive";
}

const EMPLOYEES: EmployeeRow[] = [
  { id: "1", name: "Фарҳод Раҳимов", role: "Frontend", status: "active" },
  { id: "2", name: "Ситора Каримова", role: "Backend", status: "active" },
  { id: "3", name: "Далер Шарипов", role: "Design", status: "inactive" },
  { id: "4", name: "Munira Yusupova", role: "QA", status: "active" },
];

const columns: ColumnDef<EmployeeRow>[] = [
  { accessorKey: "name", header: "Ном" },
  { accessorKey: "role", header: "Вазифа" },
  {
    accessorKey: "status",
    header: "Ҳолат",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
        {row.original.status === "active" ? "Фаъол" : "Ғайрифаъол"}
      </Badge>
    ),
  },
];

const filterConfig: FilterConfig[] = [
  { type: "input", key: "name", label: "Ном" },
  {
    type: "select",
    key: "role",
    label: "Вазифа",
    options: [
      { value: "Frontend", label: "Frontend" },
      { value: "Backend", label: "Backend" },
    ],
  },
];

const chartData = [
  { month: "Янв", tasks: 12 },
  { month: "Фев", tasks: 19 },
  { month: "Март", tasks: 9 },
  { month: "Апр", tasks: 15 },
];

const chartConfig = {
  tasks: { label: "Таскҳо", color: "var(--chart-1)" },
} satisfies ChartConfig;

const demoFormSchema = z.object({
  title: z.string().min(3, "Ҳадди ақал 3 ҳарф"),
  category: z.union([z.string(), z.number()]).nullable(),
  note: z.string().optional(),
});
type DemoFormValues = z.infer<typeof demoFormSchema>;

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel title={title} className="space-y-4">
      {children}
    </Panel>
  );
}

export default function KitchenSink() {
  const [selectValue, setSelectValue] = useState<string | number | null>(null);
  const [multiValue, setMultiValue] = useState<(string | number)[]>([]);
  const [dateValue, setDateValue] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);

  const filteredEmployees = useMemo(() => {
    return EMPLOYEES.filter((row) =>
      filters.every((f) => String(row[f.key as keyof EmployeeRow]).toLowerCase().includes(String(f.value).toLowerCase()))
    );
  }, [filters]);

  const { table } = useDataTable({ columns, data: filteredEmployees });

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: { title: "", category: null, note: "" },
  });

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl space-y-6 p-6 pb-24">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Kitchen sink</h1>
            <p className="text-muted-foreground text-sm">Намунаи ҳамаи компонентҳо — барои санҷиши визуалӣ</p>
          </div>
          <ModeToggle />
        </div>

        <BreadCrumbs items={[{ label: "Асосӣ", link: "/" }, { label: "Kitchen sink" }]} />

        <Section title="Тугмаҳо">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="icon">
              <Settings />
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Badge, Avatar, UserAvatar">
          <div className="flex flex-wrap items-center gap-4">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Avatar>
              <AvatarFallback>OW</AvatarFallback>
            </Avatar>
            <UserAvatar fullName="Наим Валиев" subInfo="Менеҷер" />
          </div>
        </Section>

        <Section title="Panel (bug-и className ислоҳшуда)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Panel className="rounded-2xl border" title="Панели оддӣ">
              <p className="text-muted-foreground text-sm">
                <code>className=&quot;rounded-2xl&quot;</code> ба контейнери берунӣ мерасад.
              </p>
            </Panel>
            <Panel className="rounded-2xl border bg-accent/40">Панел бе title</Panel>
          </div>
        </Section>

        <Section title="Card">
          <Card>
            <CardHeader>
              <CardTitle>Проекти нав</CardTitle>
              <CardDescription>Мисоли Card компонент</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Мазмуни корт дар ин ҷо ҷойгир мешавад.</p>
            </CardContent>
          </Card>
        </Section>

        <Section title="Input, InputGroup, Textarea, Switch">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CustomInput</Label>
              <CustomInput placeholder="Матн ворид кунед" />
            </div>
            <div className="space-y-1.5">
              <Label>InputGroup</Label>
              <InputGroup>
                <InputGroupAddon>@</InputGroupAddon>
                <InputGroupInput placeholder="username" />
              </InputGroup>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ks-switch" />
              <Label htmlFor="ks-switch">Фаъол</Label>
            </div>
          </div>
        </Section>

        <Section title="CustomSelect (single/multi), DateInputField">
          <div className="grid gap-4 sm:grid-cols-3">
            <CustomSelect
              label="Вазифа"
              placeholder="Интихоб кунед"
              value={selectValue}
              onChange={setSelectValue}
              options={[
                { value: "frontend", label: "Frontend" },
                { value: "backend", label: "Backend" },
              ]}
            />
            <CustomSelect
              label="Тегҳо"
              isMulti
              value={multiValue}
              onChange={setMultiValue}
              options={[
                { value: "urgent", label: "Таъҷилӣ" },
                { value: "bug", label: "Хато" },
                { value: "feature", label: "Хусусияти нав" },
              ]}
            />
            <DateInputField label="Санаи ичро" value={dateValue} onChange={setDateValue} />
          </div>
        </Section>

        <Section title="Форма (useForm + Zod)">
          <form
            id="ks-demo-form"
            className="grid gap-4 sm:grid-cols-3"
            onSubmit={form.handleSubmit(() => setModalOpen(true))}
          >
            <FormInput control={form.control} name="title" label="Сарлавҳа" required />
            <FormCustomSelect
              control={form.control}
              name="category"
              label="Категория"
              options={[
                { value: "task", label: "Таск" },
                { value: "bug", label: "Хато" },
              ]}
            />
            <FormTextarea control={form.control} name="note" label="Эзоҳ" />
          </form>
          <Button type="submit" form="ks-demo-form">
            Фиристодан
          </Button>
        </Section>

        <Section title="DataTable, FilterSheet, Pagination">
          <div className="flex items-center justify-between">
            <FilterSheet config={filterConfig} filters={filters} onApply={setFilters} onReset={() => setFilters([])} />
          </div>
          <DataTable
            table={table}
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalPages={1}
            onPageChange={setPageNumber}
            onPageSizeChange={setPageSize}
          />

          <Separator />

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive>1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </Section>

        <Section title="Dialog, Modal, ConfirmDialog, Sheet">
          <div className="flex flex-wrap gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button variant="outline">Dialog кушо</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Намунаи Dialog</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">Мазмуни dialog.</p>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Modal кушо
            </Button>
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Намунаи Modal">
              <p className="text-muted-foreground text-sm">Мазмуни Modal дар ин ҷо.</p>
            </Modal>

            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Нест кардан
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              onConfirm={() => setConfirmOpen(false)}
              title="Боварӣ доред?"
              description="Ин амал бозгашт надорад."
            />

            <Sheet>
              <SheetTrigger render={<Button variant="outline">Sheet кушо</Button>} />
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Намунаи Sheet</SheetTitle>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </div>
        </Section>

        <Section title="Popover, Tooltip, DropdownMenu, Command">
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger render={<Button variant="outline">Popover</Button>} />
              <PopoverContent>
                <p className="text-sm">Мазмуни popover.</p>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger render={<Button variant="outline">Hover кун</Button>} />
              <TooltipContent>Ин tooltip аст</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline">Меню</Button>} />
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <User /> Профил
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings /> Танзимот
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger render={<Button variant="outline">Command</Button>} />
              <PopoverContent className="w-56 p-0">
                <Command>
                  <CommandInput placeholder="Ҷустуҷӯ..." />
                  <CommandList>
                    <CommandEmpty>Чизе ёфт нашуд</CommandEmpty>
                    <CommandGroup heading="Саҳифаҳо">
                      <CommandItem>
                        <Home /> Асосӣ
                      </CommandItem>
                      <CommandItem>
                        <Info /> Дар бораи мо
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </Section>

        <Section title="Collapsible, Progress, ScrollArea, Skeleton">
          <div className="grid gap-4 sm:grid-cols-2">
            <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
              <CollapsibleTrigger render={<Button variant="outline">Кушодан/пӯшидан</Button>} />
              <CollapsibleContent className="text-muted-foreground pt-2 text-sm">
                Мазмуни пинҳоншуда.
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-2">
              <Progress value={62} />
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="text-muted-foreground h-4 w-4" /> 62%
              </div>
            </div>

            <ScrollArea className="h-24 rounded-md border p-2">
              {Array.from({ length: 20 }).map((_, i) => (
                <p key={i} className="text-sm">
                  Сатри {i + 1}
                </p>
              ))}
            </ScrollArea>

            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Section>

        <Section title="Chart">
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Section>

        <Section title="EmptyState, InfoItem, UniversalImage">
          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState message="Ҳанӯз маълумот нест" />
            <div className="space-y-3">
              <InfoItem label="Email" value="user@office.nizom.tj" />
              <InfoItem label="Ролҳо" value="Admin, Manager" />
            </div>
            <UniversalImage src={null} containerClassName="h-24 w-24 rounded-lg" />
          </div>
        </Section>

        <Section title="ByIdSkeleton (скелети саҳифаи by-id)">
          <div className="max-h-64 overflow-hidden rounded-lg border">
            <ByIdSkeleton />
          </div>
        </Section>
      </div>
    </TooltipProvider>
  );
}
