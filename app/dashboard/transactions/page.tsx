import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { getTransactions } from "@/app/actions/transactions";
import { TransactionGrid } from "@/components/transactions/TransactionGrid";

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        sort?: string;
        sortDir?: string;
        accountId?: string;
        categoryId?: string;
        direction?: string;
        dateFrom?: string;
        dateTo?: string;
    }>;
}) {
    const resolvedSearchParams = await searchParams;
    const page = Number(resolvedSearchParams.page) || 1;
    const pageSize = 20;
    const sort = resolvedSearchParams.sort || "date";
    const sortDir = resolvedSearchParams.sortDir === "asc" ? "asc" : "desc";
    const search = resolvedSearchParams.search || "";
    const accountId = resolvedSearchParams.accountId || "";
    const categoryId = resolvedSearchParams.categoryId || "";
    const direction =
        resolvedSearchParams.direction === "income" || resolvedSearchParams.direction === "expense"
            ? resolvedSearchParams.direction
            : "all";
    const dateFrom = resolvedSearchParams.dateFrom || "";
    const dateTo = resolvedSearchParams.dateTo || "";

    const [{ data, count }, accounts, categories] = await Promise.all([
        getTransactions({
            page,
            pageSize,
            sort,
            sortDir,
            search,
            accountId: accountId || undefined,
            categoryId: categoryId || undefined,
            direction,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        }),
        getAccounts(),
        getCategories(),
    ]);

    return (
        <TransactionGrid
            initialData={data || []}
            totalCount={count}
            page={page}
            pageSize={pageSize}
            sort={sort}
            sortDir={sortDir}
            search={search}
            accountId={accountId}
            categoryId={categoryId}
            direction={direction}
            dateFrom={dateFrom}
            dateTo={dateTo}
            accounts={(accounts || []).map((account) => ({ id: account.id, name: account.name }))}
            categories={(categories || []).map((category) => ({ id: category.id, name: category.name }))}
        />
    );
}
