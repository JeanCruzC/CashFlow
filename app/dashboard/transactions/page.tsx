import { getTransactions } from "@/app/actions/transactions";
import { TransactionGrid } from "@/components/transactions/TransactionGrid";

export default async function TransactionsPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string; sort?: string; sortDir?: string };
}) {
    const page = Number(searchParams.page) || 1;
    const pageSize = 20;
    const sort = searchParams.sort || "date";
    const sortDir = (searchParams.sortDir as "asc" | "desc") || "desc";
    const search = searchParams.search || "";

    const { data, count } = await getTransactions({
        page,
        pageSize,
        sort,
        sortDir,
        search,
    });

    return (
        <TransactionGrid
            initialData={data || []}
            totalCount={count}
            page={page}
            pageSize={pageSize}
            sort={sort}
            sortDir={sortDir}
            search={search}
        />
    );
}
