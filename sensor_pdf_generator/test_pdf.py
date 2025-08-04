"""Simple test script to verify PDF generation works."""
import os
import tempfile

def generate_pdf_report(sensor_value: float, filename: str, config_dir: str) -> None:
    """Generate a PDF report with the sensor value (copied from __init__.py)."""
    from fpdf import FPDF
    from fpdf.enums import XPos, YPos
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)

    pdf.cell(200, 10, text="Sensor Report (from Input Number)", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.ln(10)  # Add some space

    pdf.cell(200, 10, text=f"The current value from input number is: {sensor_value}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="L")

    # Define the output path for the PDF
    pdf_output_path = os.path.join(config_dir, filename)
    pdf.output(pdf_output_path)
    print(f"PDF saved to: {pdf_output_path}")


def test_pdf_generation():
    """Test the PDF generation with sample data."""
    print("Testing PDF Generation...")
    print("-" * 40)
    
    # Test with current directory
    test_dir = os.getcwd()
    test_filename = "test_sensor_report.pdf"
    test_value = 42.5
    
    try:
        # Generate PDF
        generate_pdf_report(test_value, test_filename, test_dir)
        
        # Check if file exists
        pdf_path = os.path.join(test_dir, test_filename)
        if os.path.exists(pdf_path):
            file_size = os.path.getsize(pdf_path)
            print(f"✅ SUCCESS: PDF created!")
            print(f"   File: {pdf_path}")
            print(f"   Size: {file_size} bytes")
            print(f"   Value used: {test_value}")
            
            # Try to open it (Windows only)
            try:
                os.startfile(pdf_path)
                print("   📄 PDF opened in default viewer")
            except:
                print("   💡 You can manually open the PDF file to verify content")
                
            return True
        else:
            print("❌ FAILED: PDF file was not created")
            return False
            
    except ImportError:
        print("❌ ERROR: fpdf2 library not installed")
        print("   Install with: pip install fpdf2==2.7.7")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False


if __name__ == "__main__":
    print("Sensor PDF Generator Test")
    print("=" * 40)
    
    success = test_pdf_generation()
    
    print("\n" + "=" * 40)
    if success:
        print("🎉 Test PASSED! PDF generation is working.")
    else:
        print("❌ Test FAILED! Check the errors above.")
