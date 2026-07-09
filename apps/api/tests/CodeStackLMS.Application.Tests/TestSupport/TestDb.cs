using CodeStackLMS.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CodeStackLMS.Application.Tests.TestSupport;

/// <summary>
/// A real relational database (SQLite in-memory) behind the production
/// ApplicationDbContext, so tests exercise actual SQL translation — including
/// the correlated subqueries used for latest-attempt resolution.
/// </summary>
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _connection;

    public ApplicationDbContext Context { get; }

    public TestDb()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        Context = new SqliteCompatibleDbContext(options);
        Context.Database.EnsureCreated();
    }

    /// <summary>
    /// The production model pins some columns to SQL Server store types
    /// (e.g. NVARCHAR(MAX)) that SQLite's DDL parser rejects — clear them so
    /// the provider picks its own defaults. Everything else is unchanged.
    /// </summary>
    private sealed class SqliteCompatibleDbContext : ApplicationDbContext
    {
        public SqliteCompatibleDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(Microsoft.EntityFrameworkCore.ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entity.GetProperties())
                {
                    if (property.GetColumnType()?.Contains("NVARCHAR", StringComparison.OrdinalIgnoreCase) == true)
                        property.SetColumnType(null);
                }
            }
        }
    }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}
