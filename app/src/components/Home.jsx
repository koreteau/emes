export function Home() {
    return (
        <div className="flex flex-col h-full">
            <div class="p-1 h-full w-full flex flex-row items-center gap-1">
                <div class="flex flex-col w-1/2 h-full gap-1">
                    <div class="border border-primary h-full p-4 rounded-tl-lg">
                        <p>Latest news</p>
                    </div>
                    <div class="border border-primary h-full p-4 rounded-bl-lg">
                        <p>Installed Applications :</p>
                        <ul className="px-3">
                            <li>Alexandria Inventory</li>
                            <li>Bespin Cloud</li>
                            <li>Capaci Finance</li>
                        </ul>
                    </div>
                </div>
                <div class="flex flex-col w-1/2 h-full gap-1">
                    <div class="border border-primary h-full p-4 rounded-tr-lg">Kronos</div>
                    <div class="border border-primary h-full p-4 rounded-br-lg">4</div>
                </div>
            </div>
        </div>
    );
}
