import React from "react";
import { useState, useEffect } from "react";

const SearchFilters = ({ filters, onFilterChange, totalResults }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState(null);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);

    if (key === "search") {
      if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
      }

      const timeout = setTimeout(() => {
        onFilterChange(newFilters);
      }, 300);

      setSearchDebounceTimeout(timeout);
    } else {
      onFilterChange(newFilters);
    }
  };

  useEffect(() => {
    return () => {
      if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
      }
    };
  }, [searchDebounceTimeout]);

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      status: "available",
      maxDistance: 50,
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Search donations
          </label>
          <input
            type="text"
            id="search"
            value={localFilters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            placeholder="Search by food item, location, or description..."
            className="input w-full"
          />
        </div>

        <div className="lg:w-48">
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Status
          </label>
          <select
            id="status"
            value={localFilters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="input w-full"
          >
            <option value="all">All Donations</option>
            <option value="available">Available</option>
            <option value="claimed">Claimed</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="lg:w-48">
          <label
            htmlFor="distance"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Max Distance (km)
          </label>
          <select
            id="distance"
            value={localFilters.maxDistance}
            onChange={(e) =>
              handleFilterChange("maxDistance", parseInt(e.target.value))
            }
            className="input w-full"
          >
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={25}>Within 25 km</option>
            <option value={50}>Within 50 km</option>
            <option value={100}>Within 100 km</option>
            <option value={999}>Any distance</option>
          </select>
        </div>

        <div className="lg:w-auto flex items-end">
          <button
            onClick={clearFilters}
            className="btn-secondary whitespace-nowrap"
          >
            🔄 Clear Filters
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <p className="text-sm text-gray-600">
            {totalResults === 1
              ? `Found ${totalResults} donation`
              : `Found ${totalResults} donations`}
            {localFilters.search && ` matching "${localFilters.search}"`}
          </p>

          {(localFilters.search ||
            localFilters.status !== "available" ||
            localFilters.maxDistance !== 50) && (
            <div className="flex flex-wrap gap-2">
              {localFilters.search && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                  Search: "{localFilters.search}"
                  <button
                    onClick={() => handleFilterChange("search", "")}
                    className="ml-1 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              )}

              {localFilters.status !== "available" && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                  Status: {localFilters.status}
                  <button
                    onClick={() => handleFilterChange("status", "available")}
                    className="ml-1 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              )}

              {localFilters.maxDistance !== 50 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
                  Distance: {localFilters.maxDistance}km
                  <button
                    onClick={() => handleFilterChange("maxDistance", 50)}
                    className="ml-1 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {totalResults === 0 && !localFilters.search && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>💡 Tip:</strong> Try these popular searches:
            </p>
            <div className="flex flex-wrap gap-2">
              {["vegetables", "bread", "rice", "pasta", "fruits"].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => handleFilterChange("search", term)}
                    className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-sm transition-colors"
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;
