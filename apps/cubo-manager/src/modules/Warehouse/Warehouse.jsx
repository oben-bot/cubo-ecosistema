import React from "react";
import { useNavigate } from "react-router-dom";
import WarehouseMain from "./WarehouseMain";

const Warehouse = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: 'url("/asset/arrow-menu.jpg") center center/cover no-repeat',
        padding: "40px"
      }}
    >
      <WarehouseMain onBackToDashboard={() => navigate("/dashboard")} />
    </div>
  );
};

export default Warehouse;