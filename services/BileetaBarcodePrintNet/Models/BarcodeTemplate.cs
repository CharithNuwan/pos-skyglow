namespace BileetaBarcodePrintNet.Models;

/// <summary>
/// Matches the payload expected by the legacy BarcodePrint service (ValuesController).
/// </summary>
public class BarcodeTemplate
{
    public string? ProductCode { get; set; }
    public string? ProductDesc { get; set; }
    public string? BarcodeNo { get; set; }
    public string? ManufactureDate { get; set; }
    public string? ExpiryDate { get; set; }
    public string? SellingPrice { get; set; }
    public string? Quantity { get; set; }
    public string? PackingLevelId { get; set; }
    public string? BarcodeTemplateId { get; set; }
    public string? NoOfBarcode { get; set; }
    public string? BarcodeType { get; set; }
    public string? BatchNo { get; set; }
    public string? SeqId { get; set; }
    public string? PluCode { get; set; }
    public string? DocNo { get; set; }
    public int OrgId { get; set; }
    public string? OrgName { get; set; }
    public string? OrgAddress { get; set; }
    public string? CompanyName { get; set; }
    public string? PostDate { get; set; }
    public string? Temp_TemplateId { get; set; }
    public string? LoadingPoint { get; set; }
    public string? Reprecentative { get; set; }
    public string? ItemDetails { get; set; }
    public string? SerialNo { get; set; }
    public string? GrossWeight { get; set; }
    public string? ContainerWeight { get; set; }
    public string? NetWeight { get; set; }
    public string? LoadingDate { get; set; }
    public string? LoadingTime { get; set; }
}
