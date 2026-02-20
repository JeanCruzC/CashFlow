import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { getTransactions } from "@/app/actions/transactions";
import { TransactionGrid } from "@/components/transactions/TransactionGrid";

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: {
        page?: string;
        search?: string;
        sort?: string;
        sortDir?: string;
        accountId?: string;
        categoryId?: string;
        direction?: string;
        dateFrom?: string;
        dateTo?: string;
    };
}) {
    const page = Number(searchParams.page) || 1;
    const pageSize = 20;
    const sort = searchParams.sort || "date";
    const sortDir = searchParams.sortDir === "asc" ? "asc" : "desc";
    const search = searchParams.search || "";
    const accountId = searchParams.accountId || "";
    const categoryId = searchParams.categoryId || "";
    const direction =
        searchParams.direction === "income" || searchParams.direction === "expense"
            ? searchParams.direction
            : "all";
    const dateFrom = searchParams.dateFrom || "";
    const dateTo = searchParams.dateTo || "";

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
