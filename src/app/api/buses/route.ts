import { NextRequest, NextResponse } from "next/server"

// In-memory database for testing
const buses = [
  {
    id: "BUS001",
    numberPlate: "TS09AB1234",
    routeName: "Route 42",
    driverId: "D2001",
    driverMemberId: "D2001",
    driverName: "John Doe",
    status: "active",
    lastSeen: "2 mins ago",
    powerOn: true,
  },
  {
    id: "BUS002",
    numberPlate: "TS09XY5678",
    routeName: "Route 10",
    driverId: "D2002",
    driverMemberId: "D2002",
    driverName: "Jane Smith",
    status: "inactive",
    lastSeen: "4 hours ago",
    powerOn: false,
  },
  {
    id: "BUS003",
    numberPlate: "TS09KJ9901",
    routeName: "Route 15",
    driverId: "D2003",
    driverMemberId: "D2003",
    driverName: "Marcus Wright",
    status: "active",
    lastSeen: "15 mins ago",
    powerOn: true,
  },
  {
    id: "BUS004",
    numberPlate: "TS09OM4423",
    routeName: "Route 42",
    driverId: "D2004",
    driverMemberId: "D2004",
    driverName: "Amanda Lee",
    status: "active",
    lastSeen: "Just now",
    powerOn: true,
  },
]

// GET - Retrieve all buses
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const filter = searchParams.get("filter")

  if (filter === "active") {
    return NextResponse.json(buses.filter((bus) => bus.status === "active"))
  }

  if (filter === "inactive") {
    return NextResponse.json(buses.filter((bus) => bus.status === "inactive"))
  }

  return NextResponse.json({
    success: true,
    data: buses,
    total: buses.length,
  })
}

// POST - Create a new bus
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { numberPlate, routeName = "Unassigned", driverName = "Unassigned" } = body

    if (!numberPlate) {
      return NextResponse.json(
        { success: false, error: "Bus number is required" },
        { status: 400 }
      )
    }

    // Check for duplicate bus number
    if (buses.some((bus) => bus.numberPlate.toUpperCase() === numberPlate.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: "Bus number already exists" },
        { status: 400 }
      )
    }

    const newBus = {
      id: `BUS${String(buses.length + 1).padStart(3, "0")}`,
      numberPlate: numberPlate.toUpperCase(),
      routeName,
      driverId: `D${Math.floor(Math.random() * 9000) + 1000}`,
      driverMemberId: `D${Math.floor(Math.random() * 9000) + 1000}`,
      driverName,
      status: "inactive",
      lastSeen: "Just now",
      powerOn: false,
    }

    buses.push(newBus)

    return NextResponse.json(
      { success: true, data: newBus, message: "Bus created successfully" },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }
}

// PUT - Update a bus
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, numberPlate, routeName, driverName, status, powerOn } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Bus ID is required" },
        { status: 400 }
      )
    }

    const busIndex = buses.findIndex((bus) => bus.id === id)

    if (busIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Bus not found" },
        { status: 404 }
      )
    }

    // Check for duplicate bus number if updated
    if (
      numberPlate &&
      buses.some(
        (bus) =>
          bus.id !== id && bus.numberPlate.toUpperCase() === numberPlate.toUpperCase()
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Bus number already exists" },
        { status: 400 }
      )
    }

    const updatedBus = {
      ...buses[busIndex],
      ...(numberPlate && { numberPlate: numberPlate.toUpperCase() }),
      ...(routeName && { routeName }),
      ...(driverName && { driverName }),
      ...(status && { status }),
      ...(powerOn !== undefined && { powerOn }),
    }

    buses[busIndex] = updatedBus

    return NextResponse.json(
      { success: true, data: updatedBus, message: "Bus updated successfully" },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }
}

// DELETE - Delete a bus
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Bus ID is required" },
        { status: 400 }
      )
    }

    const busIndex = buses.findIndex((bus) => bus.id === id)

    if (busIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Bus not found" },
        { status: 404 }
      )
    }

    const deletedBus = buses[busIndex]
    buses.splice(busIndex, 1)

    return NextResponse.json(
      { success: true, data: deletedBus, message: "Bus deleted successfully" },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }
}
