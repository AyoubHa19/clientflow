import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { ClientRecord } from "@/server/clients/service";
import { ClientStatusBadge } from "./client-status-badge";

const dash = <span className="text-muted-foreground">—</span>;

/** The clients as a table on wide screens and as cards on phones. */
export function ClientList({ clients, timeZone }: { clients: ClientRecord[]; timeZone: string }) {
  return (
    <>
      <div className="hidden overflow-x-auto surface md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Clients</caption>
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Company
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Phone
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-muted/40">
                <td className="max-w-64 px-4 py-3">
                  <Link
                    href={`/clients/${client.id}`}
                    className="block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="max-w-48 truncate px-4 py-3">{client.company ?? dash}</td>
                <td className="max-w-56 truncate px-4 py-3">{client.email ?? dash}</td>
                <td className="px-4 py-3 whitespace-nowrap">{client.phone ?? dash}</td>
                <td className="px-4 py-3">
                  <ClientStatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(client.updatedAt, timeZone)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
        {clients.map((client) => (
          <li key={client.id}>
            <Link
              href={`/clients/${client.id}`}
              className="block surface p-4 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{client.name}</span>
                <ClientStatusBadge status={client.status} />
              </div>
              {client.company && (
                <p className="mt-1 truncate text-sm text-muted-foreground">{client.company}</p>
              )}
              {client.email && <p className="mt-1 truncate text-sm">{client.email}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {formatDate(client.updatedAt, timeZone)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
